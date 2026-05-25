FROM golang:1.23-alpine

RUN adduser -D -u 1000 runner
WORKDIR /work
USER runner
