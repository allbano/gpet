FROM rust:1-alpine3.23 AS fonte
RUN apk add --no-cache build-base musl-dev
ENV CARGO_NET_RETRY=10
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY database database
COPY src src

FROM fonte AS build-dev
RUN cargo build --locked --features swagger

FROM fonte AS build-prod
RUN cargo build --locked --release

FROM alpine:3.23 AS runtime
RUN apk add --no-cache libgcc
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/atividades"]

FROM runtime AS desenvolvimento
COPY --from=build-dev /app/target/debug/backend_atividades_formativas /usr/local/bin/atividades

FROM runtime AS producao
COPY --from=build-prod /app/target/release/backend_atividades_formativas /usr/local/bin/atividades
