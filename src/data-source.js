/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/**
 * Analyses the params and extracts the data source, which is specified by a `src` param.
 * For backward compatibility, the source can also be added as path, either escaped or unescaped.
 *
 * @param {Request} req The request
 * @return {HEDYContext} the universal deploy context
 */
function dataSource(req, context) {
  const { pathInfo: { suffix } = {} } = context;
  const { searchParams } = new URL(req.url);
  const src = searchParams.get('src') || '';
  let url = null;
  if (!suffix) {
    try {
      url = new URL(src);
    } catch (e) {
      return null;
    }

    // expect the suffix to start with /https:/ or /https%3a%2f
    // the escaping done by runtime is inconsistent, the : may be decoded
  } else if (suffix.match(/^\/https(:|%3A)%2F/)) {
    url = new URL(decodeURIComponent(suffix.substring(1)
      .replace(/^https(:|%3A)%2F([^%])/, 'https://$2')));
  } else if (!suffix.startsWith('/https:/')) {
    return null;
  } else {
    url = new URL(suffix.substring(1)
      // workaround: Adobe I/O Runtime messes up consecutive spaces in URLs
      .replace(/^https:\/\/?([^/])/, 'https://$1'));
  }

  if (!src) {
    // add query params to data source url
    Array.from(searchParams.entries())
      .filter(([key]) => key !== 'api')
      .forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
  }
  return url;
}

module.exports = dataSource;
