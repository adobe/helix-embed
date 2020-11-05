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

/* eslint-env mocha */

'use strict';

const assert = require('assert');
const path = require('path');
const NodeHttpAdapter = require('@pollyjs/adapter-node-http');
const proxyquire = require('proxyquire');
const FSPersister = require('@pollyjs/persister-fs');
const { setupMocha: setupPolly } = require('@pollyjs/core');
const fetchAPI = require('@adobe/helix-fetch').context({
  httpsProtocols: ['http1'],
  httpProtocols: ['http1'],
});

const testFetch = fetchAPI.fetch;
const { assertContains } = require('./utils');
const { getIPList } = require('../src/embed');

const { embed, getEmbedKind } = proxyquire('../src/embed', { './unsplash': proxyquire('../src/unsplash.js', { '@adobe/helix-fetch': { fetch: (url) => testFetch(url) } }) });

describe('Standalone Tests', () => {
  after(async () => {
    await fetchAPI.disconnectAll();
  });

  // this test fails when recorded with Polly
  it('Supports OEmbed for Youtube', async () => {
    const { headers, body } = await embed('https://www.youtube.com/watch?v=ccYpEv4APec', { kind: 'embed-youtube' });
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['https://www.youtube.com/', 'iframe', 'oembed', 'lazy']);
  });

  it('Supports OEmbed for Youtube II', async () => {
    const { headers, body } = await embed('https://www.youtube.com/watch?v=TTCVn4EByfI', { kind: 'embed-youtube' });
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['https://www.youtube.com/', 'iframe', 'oembed']);
  });

  it('error thrown when ip-list.json not found', async () => {
    assert.rejects(getIPList('fakeGonnaFailSoHardOmg.json'));
  });
});

describe('Embed Tests', () => {
  after(async () => {
    await fetchAPI.disconnectAll();
  });

  setupPolly({
    recordFailedRequests: false,
    recordIfMissing: false,
    logging: false,
    adapters: [NodeHttpAdapter],
    persister: FSPersister,
    persisterOptions: {
      fs: {
        recordingsDir: path.resolve(__dirname, 'fixtures/recordings'),
      },
    },
  });

  beforeEach(function test() {
    this.polly.server.any().on('beforePersist', (req, recording) => {
      // this is really missing in pollyjs!
      const { response } = recording;
      if (response.cookies.length > 0) {
        response.cookies = [];
      }

      response.headers = response.headers
        .filter((entry) => (entry.name !== 'set-cookie'));
    });
  });

  it('Response is cacheable', async () => {
    const { headers, body } = await embed('http://httpbin.org', { kind: 'embed-httpbin' });
    assert.equal(headers['Cache-Control'], 'max-age=3600');
    assertContains(body, ['http://httpbin.org']);
  });

  it('Response is HTML', async () => {
    const { headers, body } = await embed('https://www.npmjs.com/package/@adobe/helix-cli', { kind: 'embed-npmjs' });
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['https://www.npmjs.com/package/@adobe/helix-cli']);
  });

  it('Supports Image Cards', async () => {
    const { headers, body } = await embed('https://blog.twitter.com/en_us/a/2015/history-of-tbt-on-twitter.html', { kind: 'embed-twitter-blog' });
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['https://blog.twitter.com/en_us/a/2015/history-of-tbt-on-twitter.html']);
  });

  it('Supports Images', async () => {
    const { headers, body } = await embed('https://unsplash.com/photos/VS_kFx4yF5g', { kind: 'embed-unsplash' });
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['embed-has-image']);
  });

  it('Supports Adobe Spark', async () => {
    const { headers, body } = await embed('https://spark.adobe.com/post/z4eHLkF8nZII1/', { kind: 'embed-spark-adobe' });
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['srcset']);
    assertContains(body, ['width/size/1200']);
    assertContains(body, ['width/size/900']);
    assertContains(body, ['width/size/600']);
    assertContains(body, ['width/size/300']);
    assertContains(body, ['Helix Hackathon']);
    assertContains(body, ['embed-spark']);
  });

  it('Supports Soundcloud', async () => {
    const { headers, body } = await embed('https://soundcloud.com/cheryl-lin-fielding/chanson-pour-jeanne?in=cheryl-lin-fielding/sets/website', { kind: 'embed-soundcloud' });
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, [
      'embed  embed-has-title embed-has-url embed-soundcloud embed-has-image embed-has-description',
      'Chabrier: Chanson pour Jeanne - Efrain Solis, Baritone & Cheryl Lin Fielding, Piano',
    ]);
  });

  it('Supports Unsplash', async function test() {
    this.polly.configure({
      matchRequestsBy: {
        headers: {
          exclude: ['user-agent', 'accept'],
        },
        url: {
          query(query) {
            return { ...query, client_id: 'dummy' };
          },
          order: false,
        },
      },
    });
    this.polly.server.any().on('beforePersist', (req, recording) => {
      // this is really missing in pollyjs!
      const idx = recording.request.url.indexOf('?client_id');
      if (idx > 0) {
        // eslint-disable-next-line no-param-reassign
        recording.request.queryString = recording.request.queryString.filter((p) => p.name !== 'client_id');
        // eslint-disable-next-line no-param-reassign
        recording.request.url = `${recording.request.url.substring(0, idx)}?client_id=dummy`;
      }
    });

    const { headers, body } = await embed('https://unsplash.com/photos/0lD9SSMC6jo', { UNSPLASH_AUTH: process.env.UNSPLASH_AUTH || 'dummy', kind: 'embed-unsplash' });
    assert.equal(headers['Content-Type'], 'text/html');
    assert.equal(headers['Cache-Control'], 'max-age=3600');
    assertContains(body, ['srcset']);
    assertContains(body, ['1080px']);
    assertContains(body, ['Unsplash']);
    assertContains(body, ['Shifaaz shamoon']);
  });

  it('Sanitizes Malicious URLs', async () => {
    // eslint-disable-next-line no-script-url
    const { headers, body } = await embed('javascript:alert(1)');
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['about:blank']);
  });

  it('Fails Gracefully', async () => {
    const { body } = await embed('https://unsplash.com/photos/0lD9SSMC6jo', { UNSPLASH_AUTH: 'superFake', kind: 'embed-unsplash' });
    assertContains(body, ['<a href="https://unsplash.com/photos/0lD9SSMC6jo">']);
  });

  it('Supports Lottifiles', async () => {
    const { body } = await embed('https://lottiefiles.com/17003-control-animated-volume-1', { kind: 'embed-lottiefiles' });
    assertContains(body, ['background="transparent" speed="1" loop="" controls="" autoplay="">', 'embed embed-oembed embed-lottiefiles', '<div class="embed embed-oembed embed-lottiefiles">', '<span class="title" style="display: none;">Control Animated. Volume 1 on Lottiefiles. Free Lottie Animation</span>']);
  });

  it('Lottifiles Fails Gracefully', async () => {
    const { body } = await embed('https://lottiefiles.com/this-will-definitely-fail-helix-141343151', { kind: 'embed-lottiefiles' });
    assertContains(body, ['<div class="embed  embed-has-title embed-has-url embed-lottiefiles embed-has-image embed-has-description">\n']);
  });

  it('Supports Spotify', async () => {
    const { body } = await embed('https://open.spotify.com/playlist/37i9dQZF1DWYWddJiPzbvb', { kind: 'embed-spotify-open' });
    assertContains(body, ['iframe src="https://open.spotify.com/embed/playlist/37i9dQZF1DWYWddJiPzbvb" width="300" height="380" frameborder="0" allowtransparency="true" allow="encrypted-media" title="Comfort Zone" loading="lazy"></iframe></div>']);
  });
});

describe('getEmbedKind tests', () => {
  it('getEmbedKind works with co.*', () => {
    const jp = new URL('https://www.youtube.co.jp');
    const spotify = new URL('https://www.open.spotify.com');

    const resultJp = getEmbedKind(jp);
    const resultSpotify = getEmbedKind(spotify);

    assert.deepEqual(resultJp, { embedKind: 'embed-youtube', secondLvlDom: 'youtube' });
    assert.deepEqual(resultSpotify, { embedKind: 'embed-spotify', secondLvlDom: 'spotify' });
  });

  it('getEmbedKind works with multiple domains', () => {
    const EXPECTED = {
      embedKind: 'embed-powerful embed-powerful-is embed-powerful-is-pipeline embed-powerful-is-pipeline-helix',
      secondLvlDom: 'powerful',
    };
    const longDomain = new URL('https://www.helix.pipeline.is.powerful.com');
    const result = getEmbedKind(longDomain);
    assert.deepEqual(result, EXPECTED);
  });
});
