FROM python:3.12-alpine

RUN adduser -D -u 1000 runner
WORKDIR /work
USER runner
