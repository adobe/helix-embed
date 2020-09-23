/*
 * Copyright 2018 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
const { fetch } = require('@adobe/helix-fetch');
const { wrap: status } = require('@adobe/helix-status');
const { wrap } = require('@adobe/openwhisk-action-utils');
const { logger } = require('@adobe/openwhisk-action-logger');
const { epsagon } = require('@adobe/helix-epsagon');
const querystring = require('querystring');
const range = require('range_check');
const { embed, getEmbedKind, addTitle } = require('./embed.js');
const dataSource = require('./data-source.js');

// lazy-loaded public ip list
let ipList;

/**
 *
 * @param {*} forwardedFor originating ip address of client
 * @param {*} fastlyPublicIps allowed list of Fastly ip addresses
 * @param {*} allowedIps allowed ip addresses
 */
async function isWithinRange(forwardedFor, fastlyPublicIps, allowedIps = '') {
  /* eslint-disable camelcase */
  const { addresses, ipv6_addresses } = fastlyPublicIps;
  const allowedRanges = allowedIps
    .split(',')
    .map((ip) => ip.trim())
    .filter((ip) => range.isIP(ip) || range.isRange(ip));

  const ranges = [...addresses, ...ipv6_addresses, allowedRanges];
  const forwarded = forwardedFor
    .split(',')
    .map((ip) => ip.trim())
    .filter((ip) => range.isIP(ip));
  /* eslint-enable camelcase */

  return forwarded.some((ip) => ranges
    .some((myranges) => (range.isRange ? range.inRange(ip, myranges) : range === ip)));
}

/**
 * sends request for embed to embedding service
 * @param {Object} params
 * @param {string} url
 * @param {Object} log
 * @returns HTTP response in JSON
 */
async function serviceembed(params, url, log) {
  const queryParams = querystring.parse(params.__ow_query);
  const qs = Object.keys(params).reduce((pv, cv) => {
    if (/^__ow_/.test(cv) || /^[A-Z]+_[A-Z]+/.test(cv) || cv === 'api') {
      return pv;
    }
    const retval = { ...pv };
    retval[cv] = params[cv];
    return retval;
  }, {});
  // add the URL
  qs.url = url;
  const { kind } = params;
  const api = new URL(params.api || params.OEMBED_RESOLVER_URI);
  if (params.OEMBED_RESOLVER_PARAM && params.OEMBED_RESOLVER_KEY) {
    if (!ipList) {
      // lazy-load public ip list
      const resp = await fetch('https://api.fastly.com/public-ip-list');
      ipList = await resp.json();
    }
    if (await isWithinRange(params.__ow_headers['x-forwarded-for'], ipList, params.ALLOWED_IPS)) {
      qs[params.OEMBED_RESOLVER_PARAM] = params.OEMBED_RESOLVER_KEY;
      log.info(`Using embedding service ${params.api || params.OEMBED_RESOLVER_URI} for URL ${url}`);
    }
  }

  Object.entries(qs).forEach(([k, v]) => {
    if (!(k in queryParams)) {
      api.searchParams.append(k, v);
    }
  });
  log.info(`FOLLOWING URL IS USED: ${api.href}`);
  return fetch(api.href)
    .then(async (resp) => {
      if (!resp.ok) {
        throw new Error(`Status ${resp.status}: ${await resp.text()}`);
      } else {
        return resp.json();
      }
    })
    .then((json) => {
      // eslint-disable-next-line no-param-reassign
      json.html = addTitle(json.html, `content from ${params.provider}`);
      return {
        headers: {
          'X-Provider': params.OEMBED_RESOLVER_URI,
          'X-Client-IP': params.__ow_headers['x-forwarded-for'],
          'Content-Type': 'text/html',
          'Cache-Control': `max-age=${json.cache_age ? json.cache_age : '3600'}`,
        },
        body: `<div class="embed embed-oembed ${kind}">${json.html}</div>`,
      };
    }).catch((error) => {
      log.error(error.message);
      // falling back to normal
      return embed(url, params);
    });
}

/* eslint-disable no-underscore-dangle, no-console, no-param-reassign */
async function run(params) {
  const { __ow_logger: log = console } = params;
  const url = dataSource((params));
  if (!url) {
    log.warn('invalid source', params.__ow_path);
    return {
      statusCode: 400,
      body: 'Expecting a datasource',
    };
  }
  const { embedKind, secondLvlDom } = getEmbedKind(url);
  params.kind = embedKind;
  params.provider = secondLvlDom;

  const urlString = url.toString();
  log.info(`Entering Helix Embed with: ${urlString}`);
  const result = await embed(urlString, params);

  if ((params.api || params.OEMBED_RESOLVER_URI) && result.headers['X-Provider'] !== 'Helix') {
    // filter all __ow_something parameters out
    return serviceembed(params, urlString, log);
  }
  return result;
}

/**
 * Main function called by the openwhisk invoker.
 * @param params Action params
 * @returns {Promise<*>} The response
 */
module.exports.main = wrap(run)
  .with(epsagon)
  .with(status)
  .with(logger.trace)
  .with(logger);
