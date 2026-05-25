FROM eclipse-temurin:21-jdk

USER root
RUN apt-get update && apt-get install -y --no-install-recommends curl unzip ca-certificates \
  && curl -fsSL -o /tmp/kotlin.zip https://github.com/JetBrains/kotlin/releases/download/v2.1.0/kotlin-compiler-2.1.0.zip \
  && unzip /tmp/kotlin.zip -d /opt \
  && ln -s /opt/kotlinc/bin/kotlinc /usr/local/bin/kotlinc \
  && rm -rf /var/lib/apt/lists/* /tmp/kotlin.zip \
  && useradd -m -u 1000 runner
WORKDIR /work
USER runner
