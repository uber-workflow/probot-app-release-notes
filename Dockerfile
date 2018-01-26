FROM node:8.9.4@sha256:6054aa20c5b7d198524d9bd56c7b2d4fde046b6825e8261ccbf441444a5f4d39

WORKDIR /probot-app-release-notes

COPY package.json /probot-app-release-notes/

RUN yarn
