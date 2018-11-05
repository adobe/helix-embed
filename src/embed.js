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
const unfurl = require('unfurl.js');

module.exports = function embed(params) {
  console.log('embedding', params);
  const {url} = params;
  const opts = Object.assign({oembed: true}, params);

  return unfurl(url, opts).then(metadata => {
    console.log(metadata);
    return {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'max-age=3600'
      },
      body: metadata.oembed.html
    }
  }).catch(error => {
    console.log(error);
    return {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'max-age=3600'
      },
      body: `<!-- ${error} --><a href="${url}">${url}</a>`
    }
  });
}