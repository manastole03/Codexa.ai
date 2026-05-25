FROM eclipse-temurin:21-jdk

RUN useradd -m -u 1000 runner
WORKDIR /work
USER runner
