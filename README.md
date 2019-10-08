# Helix Embedding Microservice

> This is a simple microservice (to be used in conjunction with [Project Helix](https://www.project-helix.io)) that turns URLs into HTML-previews of the web page behind it. It uses HTML Meta Tags, [Twitter Cards](https://developer.twitter.com/en/docs/tweets/optimize-with-cards/overview/abouts-cards.html), [Open Graph Protocol](http://ogp.me) and [OEmbed](https://oembed.com) to generate a rich preview and can be configured to use 3rd-party embed providers like Embdely or Iframely.

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-embed.svg)](https://codecov.io/gh/adobe/helix-embed)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe/helix-embed.svg)](https://circleci.com/gh/adobe/helix-embed)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-embed.svg)](https://github.com/adobe/helix-embed/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-embed.svg)](https://github.com/adobe/helix-embed/issues)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe/helix-embed.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe/helix-embed) [![Greenkeeper badge](https://badges.greenkeeper.io/adobe/helix-embed.svg)](https://greenkeeper.io/)



## Usage

Run the following command to get a preview of `http://www.adobe.com`

```bash
$ curl https://adobeioruntime.net/api/v1/web/helix/default/embed/http://www.adobe.com
```

```html
<div class="embed embed-has-url embed-has-title embed-has-image embed-has-description">
  <a href="https://www.adobe.com/">
    <span class="title">Adobe: Creative, marketing and document management solutions</span>
  </a>
  <img src="https://www.adobe.com/homepage/index/index.thumb.800.480.png?ck=1540830329" alt="Adobe: Creative, marketing and document management solutions" class="image">
    <p class="description">Adobe is changing the world through digital experiences. We help our customers create, deliver and optimize content and applications.</p>
<div>
```

## Deployment

The default deployment can be started with `npm run deploy`.

### Options

In order to use a third-party embedding service, make sure the `api` property is set at deployment time, e.g.

```bash
$ npm run zip && wsk action update embed embed.zip --kind nodejs:8 --web raw --web-secure false -p api https://my-embed-provider.com
```

All additional default parameters will be used as URL parameters when making the request to the URL specified in `api`. This allows you to create services that proxy another OEmbed-compatible provider:

Iframely uses the `api_key` parameter for API keys.

```bash
npm run zip && wsk action update embed embed.zip --kind nodejs:8 --web raw --web-secure false -p api http://iframe.ly/api/oembed -p api_key insert-here
```

Embedly, on the other hand, uses `key`

```bash
npm run zip && wsk action update embed embed.zip --kind nodejs:8 --web raw --web-secure false -p api https://api.embedly.com/1/oembed -p key insert-here
```

## Development

Use the standard trifecta of `npm install`, `npm lint`, and `npm test`.


### Build

```bash
npm install
```

### Test

```bash
npm test
```

### Lint

```bash
npm run lint
```
