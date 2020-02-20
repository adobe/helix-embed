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

function pattern(metadata) {
  if (metadata.open_graph && metadata.open_graph.url && /^https:\/\/spark\.adobe\.com\/post\/[\w]+$/.test(metadata.open_graph.url)) {
    return true;
  }
  return false;
}

const re = /dimension\/width\/size\/([\d]+)/;

function srcpair(src, width, factor) {
  const maxwidth = Math.floor(width * factor);
  const srcstr = src.replace(re, `dimension/width/size/${maxwidth}`);
  return `${srcstr} ${maxwidth}px`;
}

function srcset(src) {
  const width = src.match(re)[1];
  const maxwidth = parseInt(width, 10);

  return `${src} ${maxwidth}px, 
${srcpair(src, width, 0.75)},
${srcpair(src, width, 0.5)},
${srcpair(src, width, 0.25)}`;
}

function decorator(metadata) {
  const enriched = { ...metadata };
  const alt = metadata.title.replace(/\n/g, '');
  const src = metadata.open_graph.images[0].url;
  enriched.enriched = true;
  enriched.oEmbed = {
    html: `<img alt="${alt}" class="embed-spark" sizes="100vw" src="${src}" srcset="${srcset(src)}">`,
  };
  return Object.assign(enriched);
}

module.exports = { pattern, decorator };
