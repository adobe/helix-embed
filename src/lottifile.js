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
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "_" }] */
const { fetch } = require('@adobe/helix-fetch');

const re = /https:\/\/lottiefiles.com/
const srcRe = /lottie="(https:\/\/assets.*json)"/;

function pattern(metadata) {
  if (metadata.open_graph && metadata.open_graph.url && re.test(metadata.open_graph.url)) {
    return true;
  }
  return false;
}

async function getSrc(url){
  const resp = await fetch(url);
  if (!resp.ok) {
    return url;
  }
  return resp.text();
}
  
async function decorator(metadata) {
  const enriched = { ...metadata };
  enriched.enriched = true;
  const info = await getSrc(metadata.open_graph.url);
  const src = info.match(srcRe);

  if (src) {
    enriched.oEmbed = {
      html: `<script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>
      <lottie-player
          src=${src[1]} background="transparent"  speed="1" loop controls autoplay >
      </lottie-player>`,
    };
  }

  return Object.assign(enriched);
}
  
module.exports = { pattern, decorator };
  