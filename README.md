# probot-app-release-notes

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
