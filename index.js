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
const { wrap } = require('@adobe/helix-status');
const { openWhiskWrapper } = require('epsagon');
const { embed } = require('./src/embed');

/* eslint-disable no-underscore-dangle, no-console */
async function main(params) {
  console.log(params);
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
      console.log(error.response.body.error);
      // falling back to normal
      return embed(url);
    });
  }
  return embed(url, params);
}

exports.main = wrap(openWhiskWrapper(main, {
  token_param: 'EPSAGON_TOKEN',
  appName: 'Helix Services',
  metadataOnly: false, // Optional, send more trace data,
  ignoredKeys: [/[A-Z0-9_]+/],
}));
