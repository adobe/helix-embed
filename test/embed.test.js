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
const { embed } = require('../src/embed.js');

function assertContains(actual, patterns) {
  patterns.map(expected => assert.ok(new RegExp(expected).test(actual), `${actual} does not match ${expected}`));
}

describe('Embed Tests', () => {
  it('Response is cacheable', async () => {
    const { headers, body } = await embed({ url: 'http://www.adobe.com' });
    assert.equal(headers['Cache-Control'], 'max-age=3600');
    assertContains(body, ['https://www.adobe.com']);
  });

  it('Response is HTML', async () => {
    const { headers, body } = await embed({ url: 'https://www.npmjs.com/package/@adobe/helix-cli' });
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['https://www.npmjs.com/package/@adobe/helix-cli']);
  });

  it('Supports Image Cards', async () => {
    const { headers, body } = await embed({ url: 'https://blog.twitter.com/official/en_us/a/2015/history-of-tbt-on-twitter.html' });
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['https://blog.twitter.com/official/en_us/a/2015/history-of-tbt-on-twitter.html']);
  });

  it('Supports Images', async () => {
    const { headers, body } = await embed({ url: 'https://unsplash.com/photos/VS_kFx4yF5g' });
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['embed-has-image']);
  });


  it('Supports OEmbed Providers', async () => {
    const { headers, body } = await embed({ url: 'https://www.nytimes.com/2018/11/05/us/politics/house-senate-elections-georgia-trump.html' });
    assert.equal(headers['Content-Type'], 'text/html');
    assert.equal(headers['Cache-Control'], 'max-age=86400');
    assertContains(body, ['https://www.nytimes.com/']);
  });

  it('Fails Gracefully', async () => {
    const { headers, body } = await embed({ url: 'http://localhost' });
    assert.equal(headers['Content-Type'], 'text/html');
    assertContains(body, ['http://localhost']);
  });
});
