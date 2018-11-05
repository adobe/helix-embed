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
const { main } = require('../index.js');


describe('Index Tests', () => {
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
    assert.ok(main(params));
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
    assert.ok(main(params));
  });
});
