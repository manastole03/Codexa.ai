FROM gcc:14

RUN useradd -m -u 1000 runner
WORKDIR /work
USER runner
