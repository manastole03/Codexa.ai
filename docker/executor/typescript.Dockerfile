FROM node:20-alpine

RUN npm install -g tsx typescript && adduser -D -u 1000 runner
WORKDIR /work
USER runner
