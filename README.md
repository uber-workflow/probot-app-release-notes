# probot-app-release-notes

[![build status][build-badge]][build-href]
[![dependencies status][deps-badge]][deps-href]
[![npm version][npm-badge]][npm-href]

> a GitHub App built with [probot](https://github.com/probot/probot) that sets release notes

## Setup

```
# Install dependencies
npm install

# Run the bot
npm start
```

See [docs/deploy.md](docs/deploy.md) if you would like to run your own instance of this app.

## Config

`.github/release-notes.yml`
```yml
labels:
- security
- breaking
- interface
- bugfix
- dependencies
- performance
```

[build-badge]: https://travis-ci.org/uber-web/probot-app-release-notes.svg?branch=master
[build-href]: https://travis-ci.org/uber-web/probot-app-release-notes
[deps-badge]: https://david-dm.org/uber-web/probot-app-release-notes.svg
[deps-href]: https://david-dm.org/uber-web/probot-app-release-notes
[npm-badge]: https://badge.fury.io/js/probot-app-release-notes.svg
[npm-href]: https://www.npmjs.com/package/probot-app-release-notes
