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
/* eslint-disable camelcase */
const { unfurl } = require('unfurl.js');
const URI = require('uri-js');
const escapeHtml = require('escape-html');
const { sanitizeUrl } = require('@braintree/sanitize-url');
const { JSDOM } = require('jsdom');
const unsplash = require('./unsplash');
const lottie = require('./lottifile');
const spotify = require('./spotify');

const matchers = [];
matchers.push(unsplash);
matchers.push(lottie);
matchers.push(spotify);

/**
 * Adds title attribute or title span element if missing from embed html
 *
 * @param {string} html html of the embed
 * @returns {string} returns either iframe with title attribute or html with a span with a title
 */
function decorateHTML(html, title) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const iframes = doc.getElementsByTagName('iframe');

  if (iframes.length !== 0 && !(iframes.item(0).title)) {
    iframes.item(0).title = title;
  } else {
    const span = doc.createElement('span');
    span.innerHTML = title;
    span.className = 'title';
    span.style = 'display:none';
    doc.body.append(span);
  }
  if (iframes.length !== 0 && !(iframes.item(0).hasAttribute('loading'))) {
    iframes.item(0).setAttribute('loading', 'lazy');
  }
  return doc.body.innerHTML;
}

/**
 *
 * @param {Object} param0 metadata from call to unfurl
 * @param {*} fallbackURL url to fallback to without one from unfurl
 * @param {*} kind the class attributes for the embed url
 * @returns html of an embed
 */
function toHTML({
  oEmbed = {}, open_graph = {}, twitter_card = {}, other = {},
  title: otherTitle, description: otherDescription, classname,
}, fallbackURL, kind, provider) {
  // gather information from different providers
  const url = oEmbed.url || twitter_card.url || open_graph.url || other.canonical || fallbackURL;
  const title = twitter_card.title || open_graph.title || other.title || otherTitle || `Content from ${provider}`;
  const description = twitter_card.description || open_graph.description || otherDescription;
  const icon = url && other.appleTouchIcon ? URI.resolve(url, other.appleTouchIcon) : null;
  const twitterImage = twitter_card.images ? twitter_card.images[0].url : null;
  const ogImage = open_graph.images ? open_graph.images[0].url : null;
  const oembedImage = oEmbed.url !== url ? oEmbed.url : null;
  const image = oEmbed.thumbnail_url || twitterImage || ogImage || oembedImage;

  // there is a provider preference, let's go with it.
  if (oEmbed.html) {
    const html = decorateHTML(oEmbed.html, title);
    return `<div class="embed embed-oembed ${kind}" data-url="${escapeHtml(fallbackURL)}">
  ${html}</div>`;
  }

  const classnames = ['embed', classname];
  let html = [];
  classnames.push('embed-has-title');
  html.push(`    <span class="title" style="display:none">${title}</span>`);
  if (url) {
    classnames.push('embed-has-url');
    classnames.push(`${kind}`);
    html.push(`  <a href="${sanitizeUrl(url)}">`);
  }
  if (icon) {
    classnames.push('embed-has-icon');
    html.push(`    <img src="${icon}" alt="icon" class="icon">`);
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

  html = [`<div class="${classnames.join(' ')}"  data-url="${escapeHtml(fallbackURL)}">`, ...html, '</div>'];

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

function embed(url, params = {}) {
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

  const { kind, provider } = params;
  return unfurl(url, opts).then(enrich(params)).then((metadata) => ({
    headers: {
      'X-Provider': metadata.enriched ? 'Helix' : 'unfurl.js',
      'Content-Type': 'text/html',
      'Cache-Control': `max-age=${metadata.oEmbed && metadata.oEmbed.cacheAge ? metadata.oEmbed.cacheAge : '3600'}`,
    },
    body: toHTML(metadata, url, kind, provider),
  })).catch((error) => ({
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'max-age=3600',
    },
    body: `<!-- ${error} -->
${fromURL(url)}`,
  }));
}

/**
 * Computes the kind of embed for the given url
 * @param {string} url Embed url
 * @returns {string} class attribute for enclosing <div> tag
 */
function getEmbedKind(url) {
  const domains = url.hostname.split('.');
  // remove first level domain
  domains.pop();
  const embedKind = [];
  domains.filter((domain) => domain !== 'www' && domain !== 'co' && domain !== 'open')
    .reverse()
    .forEach((val, idx, arr) => {
      embedKind.push(arr.slice(0, idx + 1).join('-'));
    });

  return {
    embedKind: embedKind.map((value) => `embed-${value}`)
      .join(' '),
    secondLvlDom: embedKind[0],
  };
}

/**
 * ensures query parameters are propagated to src attribute
 * of rendered iframe
 * @param qp query parameters from url
 * @param html rendered html for an embed
 *
 * @returns corrected src attribute with missing query parameters
 */
function propagateQueryParams(qp, html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const iframes = doc.getElementsByTagName('iframe');

  if (iframes.length !== 0) {
    const src = iframes.item(0).getAttribute('src');
    const srcUrl = new URL(src);

    Object.keys(qp).forEach((k) => {
      if (!srcUrl.searchParams.has(k)) {
        srcUrl.searchParams.append(k, qp[k]);
      }
    });

    iframes.item(0).setAttribute('src', srcUrl.toString());
  }

  return doc.body.innerHTML;
}

module.exports = {
  embed, getEmbedKind, addTitle: decorateHTML, propagateQueryParams,
};
