FROM swift:6.0

RUN useradd -m -u 1000 runner
WORKDIR /work
USER runner
