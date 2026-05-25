FROM ruby:3.3-alpine

RUN adduser -D -u 1000 runner
WORKDIR /work
USER runner
