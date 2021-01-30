/*
 * Copyright 2019 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
const assert = require('assert');
const querystring = require('querystring');

function assertContains(actual, patterns) {
  patterns.map((expected) => assert.ok(new RegExp(expected).test(actual), `${actual} does not match ${expected}`));
}

function retrofit(fn) {
  const resolver = {
    createURL({ package, name, version }) {
      return new URL(`https://adobeioruntime.net/api/v1/web/helix/${package}/${name}@${version}`);
    },
  };
  return async (params = {}, env = {}) => {
    const {
      __ow_headers: headers = {},
      __ow_path: suffix = '',
      ...rest
    } = params;
    const resp = await fn({
      url: `https://embed.com/embed?${querystring.encode(rest)}`,
      headers: new Map(Object.entries(headers)),
    }, {
      resolver,
      env,
      pathInfo: {
        suffix,
      },
    });
    return {
      statusCode: resp.status,
      body: String(await resp.text()),
      headers: [...resp.headers.keys()].reduce((result, key) => {
        // eslint-disable-next-line no-param-reassign
        result[key] = resp.headers.get(key);
        return result;
      }, {}),
    };
  };
}

module.exports = { assertContains, retrofit };
