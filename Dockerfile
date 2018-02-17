FROM node:8.9.4@sha256:090e91ff2325ca4aa558771b7f24819825b5c8f520fb891723555bb48811f534

WORKDIR /probot-app-release-notes

COPY package.json /probot-app-release-notes/

RUN yarn
