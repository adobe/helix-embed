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
const URI = require('uri-js');

function toHTML({
  oembed = {}, ogp = {}, twitter = {}, other = {},
}, fallbackURL) {
  // there is a provider preference, let's go with it.
  if (oembed.html) {
    return `<div class="embed embed-oembed">
  ${oembed.html}
</div>`;
  }

  // gather information from different providers
  const url = oembed.url || twitter.twitterUrl || ogp.ogUrl || other.canonical || fallbackURL;
  const title = twitter.twitterTitle || ogp.ogTitle || other.title;
  const description = twitter.twitterDescription || ogp.ogDescription || other.description;
  const icon = url && other.appleTouchIcon ? URI.resolve(url, other.appleTouchIcon) : null;
  const twitterImage = twitter.twitterImage ? twitter.twitterImage[0].url : null;
  const ogImage = ogp.ogImage ? ogp.ogImage[0].url : null;
  const image = oembed.thumbnail_url || twitterImage || ogImage
    || oembed.url !== url ? oembed.url : null;

  const classnames = ['embed'];
  let html = [];
  if (url) {
    classnames.push('embed-has-url');
    html.push(`  <a href="${url}">`);
  }
  if (icon) {
    classnames.push('embed-has-icon');
    html.push(`    <img src="${icon}" alt="icon" class="icon">`);
  }
  if (title) {
    classnames.push('embed-has-title');
    html.push(`    <span class="title">${title}</span>`);
  }
  if (url) {
    html.push('  </a>');
  }
  if (image) {
    classnames.push('embed-has-image');
    html.push(`  <img src="${image}" alt="${title}" class="image">`);
  }
  if (description) {
    classnames.push('embed-has-description');
    html.push(`    <p class="description">${description}</p>`);
  }


  html = [`<div class="${classnames.join(' ')}">`, ...html, '<div>'];


  return html.join('\n');
}

function fromURL(url) {
  return `<a href="${url}">${url}</a>`;
}

function embed(params) {
  const { url } = params;
  const opts = Object.assign({ oembed: true }, params);

  return unfurl(url, opts).then(metadata => ({
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': `max-age=${metadata.oembed && metadata.oembed.cacheAge ? metadata.oembed.cacheAge : '3600'}`,
    },
    body: toHTML(metadata),
  })).catch(error => ({
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'max-age=3600',
    },
    body: `<!-- ${error} -->
${fromURL(url)}`,
  }));
}

module.exports = { embed };
