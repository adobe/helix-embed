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

const fetchAPI = require('@adobe/helix-fetch');

const { fetch } = process.env.HELIX_FETCH_FORCE_HTTP1
  /* istanbul ignore next */
  ? fetchAPI.context({
    userAgent: 'helix-fetch', // static user-agent for recorded tests
    alpnProtocols: [fetchAPI.ALPN_HTTP1_1],
  })
  : fetchAPI;

const { wrap: status } = require('@adobe/helix-status');
const { wrap } = require('@adobe/helix-shared');
const { logger } = require('@adobe/helix-universal-logger');
const { Response } = require('@adobe/helix-universal');
const range = require('range_check');
const {
  embed, getEmbedKind, addTitle, propagateQueryParams,
} = require('./embed.js');
const dataSource = require('./data-source.js');
// require ip-list.json which is updated every build
const ipList = require('../ip-list.json');

/**
 *
 * @param {*} forwardedFor originating ip address of client
 * @param {*} fastlyPublicIps allowed list of Fastly ip addresses
 * @param {*} allowedIps allowed ip addresses
 */

function isWithinRange(forwardedFor, fastlyPublicIps, allowedIps = '') {
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
async function serviceembed(req, context, params, url) {
  const { log, env } = context;
  const { kind } = params;
  const xf = req.headers.get('x-forwarded-for');

  const api = new URL(params.api || env.OEMBED_RESOLVER_URI);
  api.searchParams.append('url', url);

  if (env.OEMBED_RESOLVER_PARAM && env.OEMBED_RESOLVER_KEY) {
    if (isWithinRange(xf, ipList, env.ALLOWED_IPS)) {
      api.searchParams.append(env.OEMBED_RESOLVER_PARAM, env.OEMBED_RESOLVER_KEY);
      log.info(`Using embedding service ${api} for URL ${url}`);
    } else {
      log.info(`No using embedding service. IP ${xf} is not allowed.`);
    }
  }
  Object.entries(params).forEach(([key, value]) => {
    if (!/^[A-Z]+_[A-Z]+/.test(key) && key !== 'api') {
      api.searchParams.append(key, value);
    }
  });

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
      // eslint-disable-next-line no-param-reassign
      json.html = propagateQueryParams(params, json.html);
      return {
        headers: {
          'X-Provider': env.OEMBED_RESOLVER_URI,
          'X-Client-IP': xf,
          'Content-Type': 'text/html',
          'Cache-Control': `max-age=${json.cache_age ? json.cache_age : '3600'}`,
        },
        status: 200,
        body: `<div class="embed embed-oembed ${kind}">${json.html}</div>`,
      };
    }).catch((error) => {
      log.error(error.message);
      // falling back to normal
      return {
        status: 400,
        body: error.message,
      };
    });
}

async function run(req, context) {
  const { log, env } = context;
  const { searchParams } = new URL(req.url);
  const params = Array.from(searchParams.entries()).reduce((p, [key, value]) => {
    // eslint-disable-next-line no-param-reassign
    p[key] = value;
    return p;
  }, {});

  const url = dataSource(req, context);
  const promises = [];

  if (!url) {
    log.warn('invalid source', context.pathInfo.suffix);
    return new Response('Expecting a datasource', {
      status: 400,
    });
  }
  const { embedKind, secondLvlDom } = getEmbedKind(url);
  params.kind = embedKind;
  params.provider = secondLvlDom;

  const urlString = url.toString();

  // start promise for hlx inhouse built embeds using unfurl
  promises.push(embed(urlString, params));

  // check that OEMBED_RESOLVER_URI and a OEMBED service key are included
  if ((params.api || env.OEMBED_RESOLVER_URI)) {
    // add service based embed to be concurrently resolved
    promises.push(serviceembed(req, context, params, urlString));
  }
  const [hlxEmbed, serviceEmbed] = await Promise.all(promises);
  let result = hlxEmbed;

  // if params for external embed service are provided; the array
  // of resolved promises will be of length 2 so we test for this case
  if (serviceEmbed && (hlxEmbed.headers['X-Provider'] !== 'Helix') && (serviceEmbed.status !== 400)) {
    result = serviceEmbed;
  }
  return new Response(result.body, {
    status: result.statusCode,
    headers: result.headers,
  });
}

/**
 * Main function called by the openwhisk invoker.
 * @param params Action params
 * @returns {Promise<*>} The response
 */
module.exports.main = wrap(run)
  .with(status)
  .with(logger.trace)
  .with(logger);
