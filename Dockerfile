FROM node:8.11.3@sha256:38953a117b8f794426429314126af19ff17bbfaa5449c1829b9a8412b8ef4536

WORKDIR /probot-app-release-notes

COPY package.json /probot-app-release-notes/

RUN yarn
