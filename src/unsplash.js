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
const request = require('request-promise-native');
const URI = require('uri-js');
const querystring = require('querystring');

function pattern(metadata, options) {
  if (options && options.UNSPLASH_AUTH && metadata.open_graph && metadata.open_graph.url && /^https:\/\/unsplash.com\/photos\/[\w]+$/.test(metadata.open_graph.url)) {
    return true;
  }
  return false;
}

const re = /^https:\/\/unsplash.com\/photos\/([\w]+)$/;

function srcset(urls, width) {
  return Object.values(urls).map((url) => {
    const { query } = URI.parse(url);
    const w = querystring.parse(query).w || width;
    return `${url} ${w}px`;
  }).join(',\n');
}

async function meta(src, clientid) {
  const id = src.match(re)[1];
  const qs = {
    client_id: clientid,
  };
  return request({ uri: `https://api.unsplash.com/photos/${id}`, qs, json: true });
}

async function decorator(metadata, options) {
  const enriched = { ...metadata };
  const src = metadata.twitter_card.url;

  const {
    user, urls, alt_description, width,
  } = await meta(src, options.UNSPLASH_AUTH);

  enriched.enriched = true;
  enriched.oEmbed = {
    html: `<img alt="${alt_description}" class="embed-unsplash" sizes="100vw" src="${urls.full}" srcset="${srcset(urls, width)}">
<p class="unsplash-attribution">Photo by <a href="https://unsplash.com/@${user.username}?utm_source=Helix%20Embed&utm_medium=referral">${user.name}</a> on <a href="https://unsplash.com/?utm_source=Helix%20Embed&utm_medium=referral">Unsplash</a>
</p>`,
  };
  return Object.assign(enriched);
}

module.exports = { pattern, decorator };
