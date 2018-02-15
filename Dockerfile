FROM node:8.9.4@sha256:9f4efebdb42aa2c0eb752830a6ce57ff73afa7ee19b24804d32bf3e1252b4b72

WORKDIR /probot-app-release-notes

COPY package.json /probot-app-release-notes/

RUN yarn
