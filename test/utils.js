/*
 * Copyright 2019 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
const { fetch, timeoutSignal, AbortError } = require('@adobe/helix-fetch');
const assert = require('assert');

function assertContains(actual, patterns) {
  patterns.map((expected) => assert.ok(new RegExp(expected).test(actual), `${actual} does not match ${expected}`));
}

async function fetchAndRetry(url, duration = 0, defaultTimeout = 300) {
  if (duration >= 1000) {
    throw new Error(`Request to ${url} failing after multiple connection retries`);
  }
  let resp;
  try {
    resp = await fetch(url, { signal: timeoutSignal(defaultTimeout) });
  } catch (err) {
    if (err instanceof AbortError) {
      fetchAndRetry(url, duration + defaultTimeout);
    } else {
      throw err;
    }
  }
  return resp.json();
}

module.exports = { assertContains, fetchAndRetry };
