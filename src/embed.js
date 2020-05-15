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
const { unfurl } = require('unfurl.js');
const URI = require('uri-js');
const { sanitizeUrl } = require('@braintree/sanitize-url');
const spark = require('./spark');
const unsplash = require('./unsplash');
const lottie = require('./lottifile');
const spotify = require('./spotify');

const matchers = [];
matchers.push(spark);
matchers.push(unsplash);
matchers.push(lottie);
matchers.push(spotify);

function toHTML({
  oEmbed = {}, open_graph = {}, twitter_card = {}, other = {},
  title: otherTitle, description: otherDescription, classname,
}, fallbackURL) {
  // there is a provider preference, let's go with it.
  if (oEmbed.html) {
    return `<div class="embed embed-oembed">
  ${oEmbed.html}
</div>`;
  }

  // gather information from different providers
  const url = oEmbed.url || twitter_card.url || open_graph.url || other.canonical || fallbackURL;
  const title = twitter_card.title || open_graph.title || other.title || otherTitle;
  const description = twitter_card.description || open_graph.description || otherDescription;
  const icon = url && other.appleTouchIcon ? URI.resolve(url, other.appleTouchIcon) : null;
  const twitterImage = twitter_card.images ? twitter_card.images[0].url : null;
  const ogImage = open_graph.images ? open_graph.images[0].url : null;
  const oembedImage = oEmbed.url !== url ? oEmbed.url : null;
  const image = oEmbed.thumbnail_url || twitterImage || ogImage || oembedImage;

  const classnames = ['embed', classname];
  let html = [];
  if (url) {
    classnames.push('embed-has-url');
    html.push(`  <a href="${sanitizeUrl(url)}">`);
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


  html = [`<div class="${classnames.join(' ')}">`, ...html, '</div>'];


  return html.join('\n');
}

function fromURL(url) {
  return `<a href="${sanitizeUrl(url)}">${url}</a>`;
}

function enrich(params) {
  return function enricher(metadata) {
    const matching = matchers.reduce((meta, { pattern, decorator }) => {
      if (pattern(meta, params)) {
        return decorator(meta, params);
      }
      return meta;
    }, metadata);
    return Promise.resolve(matching);
  };
}

function embed(url, params) {
  const opts = { oembed: true, url };

  if (!url) {
    return {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'max-age=3600',
      },
      body: '<!-- nothing to embed -->',
    };
  }

  return unfurl(url, opts).then(enrich(params)).then((metadata) => ({
    headers: {
      'X-Provider': metadata.enriched ? 'Helix' : 'unfurl.js',
      'Content-Type': 'text/html',
      'Cache-Control': `max-age=${metadata.oEmbed && metadata.oEmbed.cacheAge ? metadata.oEmbed.cacheAge : '3600'}`,
    },
    body: toHTML(metadata, url),
  })).catch((error) => ({
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'max-age=3600',
    },
    body: `<!-- ${error} -->
${fromURL(url)}`,
  }));
}

module.exports = { embed };
