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
const chai = require('chai');
const chaiHttp = require('chai-http');
const packjson = require('../package.json');


chai.use(chaiHttp);
const { expect } = chai;

function getbaseurl() {
  const namespace = 'helix';
  const package = 'helix-services-private';
  const name = packjson.name.replace('@adobe/helix-', '');
  let version = `${packjson.version}`;
  if (process.env.CI && process.env.CIRCLE_BUILD_NUM && process.env.CIRCLE_BRANCH !== 'master') {
    version = `ci${process.env.CIRCLE_BUILD_NUM}`;
  }
  return `api/v1/web/${namespace}/${package}/${name}@${version}`;
}

describe('Running Post-Deployment Integration Tests', () => {
  it('Youtube OEmbed', async () => {
    await chai
      .request('https://adobeioruntime.net/')
      .get(`${getbaseurl()}/https://www.youtube.com/watch?v=TTCVn4EByfI`)
      .then((response) => {
        expect(response).to.have.status(200);
        expect(response.text).to.contain('youtube.com');
        expect(response.text).to.contain('iframe');
        expect(response.text).to.contain('oembed');
      }).catch((e) => {
        throw e;
      });
  });

  it('Spark srcset', async () => {
    await chai
      .request('https://adobeioruntime.net/')
      .get(`${getbaseurl()}/https://spark.adobe.com/post/z4eHLkF8nZII1/`)
      .then((response) => {
        expect(response).to.have.status(200);
        expect(response.text).to.contain('srcset');
      }).catch((e) => {
        throw e;
      });
  });

  it('Unsplash srcset', async () => {
    await chai
      .request('https://adobeioruntime.net/')
      .get(`${getbaseurl()}/https://unsplash.com/photos/0lD9SSMC6jo`)
      .then((response) => {
        console.log(response.text);
        expect(response).to.have.status(200);
        expect(response.text).to.contain('Unsplash');
        expect(response.text).to.contain('srcset');
      }).catch((e) => {
        throw e;
      });
  });

  it('Service reports status', async () => {
    await chai
      .request('https://adobeioruntime.net/')
      .get(`${getbaseurl()}/_status_check/healthcheck.json`)
      .then((response) => {
        expect(response).to.have.status(200);
        expect(response).to.have.header('Content-Type', 'application/json');
      }).catch((e) => {
        throw e;
      });
  });
}).timeout(10000);
