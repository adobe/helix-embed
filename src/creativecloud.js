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
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "_" }] */
const re = /https:\/\/www.ccv.adobe.com/;

function pattern(metadata, params) {
  const test = re.test(metadata.favicon) && re.test(params.__ow_path);
  if (test) {
    return true;
  }
  return false;
}

async function decorator(metadata, params) {
  const enriched = { ...metadata };
  enriched.enriched = true;
  let src = params.__ow_path;
  if (/^\//.test(src)) {
    src = src.substr(1, src.length);
  }

  if (src) {
    enriched.oEmbed = {
      html: `<iframe data-player-id="" 
      data-type="other" data-src="${src}" 
      width="100%" height="550" frameborder="0" allowfullscreen="allowfullscreen" src="${src}">
      </iframe>`,
    };
  }

  return Object.assign(enriched);
}

module.exports = { pattern, decorator };
