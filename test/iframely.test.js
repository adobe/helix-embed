/*
 * Copyright 2022 Adobe. All rights reserved.
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

process.env.HELIX_FETCH_FORCE_HTTP1 = 'true';

// const assert = require('assert');
const path = require('path');
const NodeHttpAdapter = require('@pollyjs/adapter-node-http');
const FSPersister = require('@pollyjs/persister-fs');
const { setupMocha: setupPolly } = require('@pollyjs/core');
const { assertContains, retrofit } = require('./utils.js');
const { main: universalMain } = require('../src/index.js');

require('dotenv').config();

const main = retrofit(universalMain);

const OEMBED_RESOLVER_KEY = process.env.OEMBED_RESOLVER_KEY || 'dummy';

describe('IFramely Tests', () => {
  setupPolly({
    recordFailedRequests: true,
    recordIfMissing: false,
    adapters: [NodeHttpAdapter],
    persister: FSPersister,
    persisterOptions: {
      fs: {
        recordingsDir: path.resolve(__dirname, 'fixtures/recordings'),
      },
    },
    matchRequestsBy: {
      url: {
        protocol: true,
        username: false,
        password: false,
        hostname: true,
        port: false,
        pathname: true,
        query: false,
        hash: true,
      },
      body: false,
      headers: true,
      method: true,
      order: false,
    },
  });

  beforeEach(function test() {
    this.polly.server.any().on('beforePersist', (req, recording) => {
      const { response } = recording;
      if (response.cookies.length > 0) {
        response.cookies = [];
      }

      response.headers = response.headers
        .filter((entry) => (entry.name !== 'set-cookie'));

      if (recording.request.url.match(/[&?]api_key=[^&]*/)) {
        // eslint-disable-next-line no-param-reassign
        recording.request.queryString = recording.request.queryString.filter((p) => p.name !== 'api_key');
        // eslint-disable-next-line no-param-reassign
        recording.request.url = recording.request.url.replace(/([&?])api_key=[^&]*/, '$1api_key=dummy');
      }
    });
  });

  it('IFramely used for allowed IP addresses', async () => {
    const params = {
      __ow_headers: {
        'accept-encoding': 'gzip, deflate',
        connection: 'close',
        host: 'controller-a',
        'perf-br-req-in': '1572859933.107',
        'user-agent': 'node-superagent/3.8.3',
        // copied from example
        'x-forwarded-for': '3.80.39.228',
        'x-forwarded-port': '443',
        'x-forwarded-proto': 'https',
      },
      __ow_path: '/https://www.youtube.com/watch',
      v: 'TTCVn4EByfI',
      w: '1',
    };
    const env = {
      UNSPLASH_AUTH: 'SECRET',
      OEMBED_RESOLVER_URI: 'https://iframe.ly/api/oembed',
      OEMBED_RESOLVER_PARAM: 'api_key',
      OEMBED_RESOLVER_KEY,
      ALLOWED_IPS: '3.80.39.228',
    };

    const result = await main(params, env);
    assertContains(result.body, ['https://www.youtube.com/embed/TTCVn4EByfI\\?rel=0']);
  });

  it('IFramely not used for other IP addresses', async () => {
    const params = {
      __ow_headers: {
        'accept-encoding': 'gzip, deflate',
        connection: 'close',
        host: 'controller-a',
        'perf-br-req-in': '1572859933.107',
        'user-agent': 'node-superagent/3.8.3',
        // copied from Runtime
        'x-forwarded-for': '192.150.10.210, 10.250.204.238',
        'x-forwarded-port': '443',
        'x-forwarded-proto': 'https',
      },
      __ow_path: '/https://www.youtube.com/watch',
      v: 'TTCVn4EByfI',
      w: '1',
    };
    const env = {
      UNSPLASH_AUTH: 'SECRET',
      OEMBED_RESOLVER_URI: 'https://iframe.ly/api/oembed',
      OEMBED_RESOLVER_PARAM: 'api_key',
      OEMBED_RESOLVER_KEY,
    };
    const result = await main(params, env);
    assertContains(result.body, ['https://www.youtube.com/embed/TTCVn4EByfI\\?feature=oembed', 'embed-youtube']);
  });

  it('IFramely used for Fastly IP addresses', async () => {
    const params = {
      __ow_headers: {
        'accept-encoding': 'gzip, deflate',
        connection: 'close',
        host: 'controller-a',
        'perf-br-req-in': '1572859933.107',
        'user-agent': 'node-superagent/3.8.3',
        // copied from Runtime
        'x-forwarded-for': '104.156.80.19, 192.150.10.210, 10.250.204.238',
        'x-forwarded-port': '443',
        'x-forwarded-proto': 'https',
      },
      __ow_path: '/https://www.youtube.com/watch',
      v: 'TTCVn4EByfI',
      w: '1',
    };
    const env = {
      UNSPLASH_AUTH: 'SECRET',
      OEMBED_RESOLVER_URI: 'https://iframe.ly/api/oembed',
      OEMBED_RESOLVER_PARAM: 'api_key',
      OEMBED_RESOLVER_KEY,
    };
    const result = await main(params, env);
    assertContains(result.body, ['https://www.youtube.com/embed/TTCVn4EByfI\\?rel=0']);
  });

  it('query params are propagated to rendered html', async () => {
    const params = {
      __ow_headers: {
        'accept-encoding': 'gzip, deflate',
        connection: 'close',
        host: 'controller-a',
        'perf-br-req-in': '1572859933.107',
        'user-agent': 'node-superagent/3.8.3',
        // copied from example
        'x-forwarded-for': '3.80.39.228',
        'x-forwarded-port': '443',
        'x-forwarded-proto': 'https',
      },
      __ow_path: '/https://video.tv.adobe.com/v/326530/',
      hidetitle: true,
    };
    const env = {
      UNSPLASH_AUTH: 'SECRET',
      OEMBED_RESOLVER_URI: 'https://iframe.ly/api/oembed',
      OEMBED_RESOLVER_PARAM: 'api_key',
      OEMBED_RESOLVER_KEY,
      ALLOWED_IPS: '3.80.39.228',
    };

    const result = await main(params, env);
    assertContains(result.body, ['https://video.tv.adobe.com/v/326530\\?hidetitle=true']);
  });
});
