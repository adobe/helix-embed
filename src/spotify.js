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

function pattern(metadata) {
  if (metadata.open_graph && metadata.open_graph.url && /^https:\/\/open\.spotify\.com\/playlist\/[\w]+$/.test(metadata.open_graph.url)) {
    return true;
  }
  return false;
}

function decorator(metadata) {
  const enriched = { ...metadata };
  const src = metadata.open_graph.url.replace(/open\.spotify\.com\/playlist/, 'open.spotify.com/embed/playlist');
  enriched.enriched = true;
  enriched.oEmbed = {
    html: `<iframe src="${src}" width="300" height="380" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`,
  };
  return Object.assign(enriched);
}

module.exports = { pattern, decorator };
