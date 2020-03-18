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
const proxyquire = require('proxyquire');
const testFetch = require('@adobe/helix-fetch').context({
  http1: {
    keepAlive: false,
  },
  httpsProtocols: ['http1'],
  httpProtocols: ['http1'],
}).fetch;
const { assertContains } = require('./utils.js');

const { main } = proxyquire('../src/index.js', { '@adobe/helix-fetch': { fetch: (url) => testFetch(url) } });

describe('Index Tests', () => {
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

  beforeEach(function beforeEach() {
    this.polly.server.any().on('beforePersist', (req, recording) => {
      const { response } = recording;
      if (response.cookies.length > 0) {
        response.cookies = [];
      }

      response.headers = response.headers
        .filter((entry) => (entry.name !== 'set-cookie'));
    });

    this.polly.configure({
      matchRequestsBy: {
        headers: {
          exclude: ['user-agent', 'accept'],
        },
      },
    });
  });

  it('Index works with Youtube URL parameters', async () => {
    const params = {
      __ow_headers: {
        'accept-encoding': 'gzip, deflate',
        connection: 'close',
        host: 'controller-a',
        'perf-br-req-in': '1572859933.107',
        'user-agent': 'node-superagent/3.8.3',
        'x-forwarded-for': '3.80.39.228',
        'x-forwarded-port': '443',
        'x-forwarded-proto': 'https',
      },
      __ow_method: 'get',
      __ow_path: '/https://www.youtube.com/watch',
      v: 'TTCVn4EByfI',
      w: '1',
      UNSPLASH_AUTH: 'SECRET',
    };
    const result = await main(params);
    assertContains(result.body, ['https://www.youtube.com/', 'iframe', 'oembed']);
  });

  it('Index works with parameters', async () => {
    const params = {
      api: 'http://iframe.ly/api/oembed',
      api_key: 'fake_invalid',
      setting: 'foo, bar',
      __ow_method: 'get',
      __ow_headers: {
        'Content=Type': 'text/html',
      },
      __ow_path: '/https://github.com/request/request-promise',
    };
    assert.ok(await main(params));
  });

  it('Index without parameters', async () => {
    const params = {
      api_key: 'fake_invalid',
      setting: 'foo, bar',
      __ow_method: 'get',
      __ow_headers: {
        'Content=Type': 'text/html',
      },
      __ow_path: '/https://github.com/request/request-promise',
    };
    assert.ok(await main(params));
  });
});
