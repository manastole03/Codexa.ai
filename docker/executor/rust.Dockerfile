FROM rust:1.83-slim

RUN useradd -m -u 1000 runner
WORKDIR /work
USER runner
