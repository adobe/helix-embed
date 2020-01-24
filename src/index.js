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
const request = require('request-promise-native');
const { wrap: status } = require('@adobe/helix-status');
const { wrap } = require('@adobe/openwhisk-action-utils');
const { logger } = require('@adobe/openwhisk-action-logger');
const { epsagon } = require('@adobe/helix-epsagon');
const { embed } = require('./embed.js');

/* eslint-disable no-underscore-dangle, no-console, no-param-reassign */
async function run(params) {
  const { __ow_logger: log = console } = params;
  if (!params.__ow_query) {
    // reconstruct __ow_query
    const query = Object.keys(params)
      .filter((key) => !/^[A-Z]+_[A-Z]+/.test(key))
      .filter((key) => key !== 'api')
      .filter((key) => !/^__ow_/.test(key))
      .reduce((pv, cv) => {
        if (pv) {
          return `${pv}&${cv}=${params[cv]}`;
        }
        return `${cv}=${params[cv]}`;
      }, '');
    params.__ow_query = query;
  }
  const url = `${params.__ow_path.substring(1)}?${params.__ow_query || ''}`;
  if (params.api) {
    // filter all __ow_something parameters out
    // and all parameters in all caps
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


    return request({ uri: params.api, qs, json: true }).then((json) => ({
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': `max-age=${json.cache_age ? json.cache_age : '3600'}`,
      },
      body: json.html,
    })).catch((error) => {
      log.error(error.response.body.error);
      // falling back to normal
      return embed(url);
    });
  }
  return embed(url, params);
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
