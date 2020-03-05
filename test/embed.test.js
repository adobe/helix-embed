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
const FSPersister = require('@pollyjs/persister-fs');
const { setupMocha: setupPolly } = require('@pollyjs/core');
const { embed } = require('../src/embed.js');
const { assertContains } = require('./utils');

describe('Standalone Tests', () => {
  // this test fails when recorded with Polly
  it('Supports OEmbed for Youtube', async () => {
    const { headers, body } = await embed('https://www.youtube.com/watch?v=ccYpEv4APec');
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['https://www.youtube.com/', 'iframe', 'oembed']);
  });

  it('Supports OEmbed for Youtube II', async () => {
    const { headers, body } = await embed('https://www.youtube.com/watch?v=TTCVn4EByfI');
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['https://www.youtube.com/', 'iframe', 'oembed']);
  });
});

describe('Embed Tests', () => {
  setupPolly({
    recordFailedRequests: true,
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

  beforeEach(function beforeEach() {
    this.polly.configure({
      matchRequestsBy: {
        headers: {
          exclude: ['user-agent', 'accept'],
        },
      },
    });
  });

  it('Unsplash Failes Gracefully', async () => {
    const { headers } = await embed('https://unsplash.com/photos/0lD9SSMC6jo', { UNSPLASH_AUTH: process.env.UNSPLASH_AUTH || 'dummy' });
    assert.equal(headers['Content-Type'], 'text/html');
  });

  it('Response is cacheable', async () => {
    const { headers, body } = await embed('http://httpbin.org');
    assert.equal(headers['Cache-Control'], 'max-age=3600');
    assertContains(body, ['http://httpbin.org']);
  });

  it('Response is HTML', async () => {
    const { headers, body } = await embed('https://www.npmjs.com/package/@adobe/helix-cli');
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['https://www.npmjs.com/package/@adobe/helix-cli']);
  });

  it('Supports Image Cards', async () => {
    const { headers, body } = await embed('https://blog.twitter.com/en_us/a/2015/history-of-tbt-on-twitter.html');
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['https://blog.twitter.com/en_us/a/2015/history-of-tbt-on-twitter.html']);
  });

  it('Supports Images', async () => {
    const { headers, body } = await embed('https://unsplash.com/photos/VS_kFx4yF5g');
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['embed-has-image']);
  });

  it('Supports Adobe Spark', async () => {
    const { headers, body } = await embed('https://spark.adobe.com/post/z4eHLkF8nZII1/');
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['srcset']);
    assertContains(body, ['width/size/1200']);
    assertContains(body, ['width/size/900']);
    assertContains(body, ['width/size/600']);
    assertContains(body, ['width/size/300']);
    assertContains(body, ['Helix Hackathon']);
    assertContains(body, ['embed-spark']);
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

    const { headers, body } = await embed('https://unsplash.com/photos/0lD9SSMC6jo', { UNSPLASH_AUTH: process.env.UNSPLASH_AUTH || '7-N6a19uizlwDntR9sAxxeBFfZuC6FV_VYYp1AbAros' });
    assert.equal(headers['Content-Type'], 'text/html');
    assert.equal(headers['Cache-Control'], 'max-age=3600');
    assertContains(body, ['srcset']);
    assertContains(body, ['1080px']);
    assertContains(body, ['Unsplash']);
    assertContains(body, ['Shifaaz shamoon']);
  });

  it('Fails Gracefully', async () => {


    const { headers, body } = await embed('http://localhost');
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['http://localhost']);
  });

  it('Sanitizes Malicious URLs', async () => {
    // eslint-disable-next-line no-script-url
    const { headers, body } = await embed('javascript:alert(1)');
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['about:blank']);
  });
});
