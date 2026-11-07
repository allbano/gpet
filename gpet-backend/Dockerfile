# syntax=docker/dockerfile:1
FROM ghcr.io/graalvm/native-image-community:25.0.2-ol9-20260120 AS graalvm

# PostgreSQL efêmero para gerar jOOQ a partir das migrations durante o build.
FROM postgres:18.6-bookworm AS build
RUN apt-get update && apt-get install -y --no-install-recommends g++ zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*
COPY --from=graalvm /usr/lib64/graalvm/graalvm-community-java25 /opt/graalvm
ENV JAVA_HOME=/opt/graalvm
ENV PATH="/opt/graalvm/bin:${PATH}"
WORKDIR /workspace
RUN chown postgres:postgres /workspace
COPY --chown=postgres:postgres --chmod=0755 gradlew docker-build-native.sh ./
COPY --chown=postgres:postgres gradle ./gradle
COPY --chown=postgres:postgres build.gradle.kts settings.gradle.kts gradle.properties ./
COPY --chown=postgres:postgres src ./src
USER postgres
RUN --mount=type=cache,id=gpet-native-gradle,target=/var/lib/postgresql/.gradle,uid=999,gid=999 \
    ./docker-build-native.sh

FROM ubuntu:26.04 AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* && useradd --uid 1001 --create-home gpet
WORKDIR /work
COPY --from=build --chown=1001:1001 --chmod=0755 /workspace/build/*-runner /work/application
COPY --from=build --chown=1001:1001 /workspace/graalvm-build.txt /work/graalvm-build.txt
COPY --chown=1001:1001 --chmod=0755 docker-entrypoint.sh /work/docker-entrypoint.sh
USER 1001
LABEL br.ufpr.gpet.runtime="native" br.ufpr.gpet.compiler="GraalVM CE 25.0.2"
EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=3s --retries=3 CMD curl --fail --silent http://127.0.0.1:8080/q/health/ready || exit 1
ENTRYPOINT ["/work/docker-entrypoint.sh"]
