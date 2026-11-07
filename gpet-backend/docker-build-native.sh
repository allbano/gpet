#!/usr/bin/env bash
set -euo pipefail

# Este cluster existe apenas na camada de compilação e não lê os secrets da aplicação.
gpet_build_dir=$(mktemp -d /tmp/gpet-codegen.XXXXXX)
limpar() {
    pg_ctl -D "$gpet_build_dir/data" -m immediate -w stop >/dev/null 2>&1 || true
    rm -rf "$gpet_build_dir"
}
trap limpar EXIT
initdb -D "$gpet_build_dir/data" -U postgres --auth=trust --no-locale --encoding=UTF8 >/dev/null
pg_ctl -D "$gpet_build_dir/data" -l "$gpet_build_dir/postgres.log" \
    -o "-h 127.0.0.1 -p 6543 -k $gpet_build_dir" -w start
createdb -h 127.0.0.1 -p 6543 -U postgres gpet_codegen

native-image --version | tee graalvm-build.txt
./gradlew --no-daemon --console=plain quarkusBuild \
    -PgpetCodegenPort=6543 \
    -Dquarkus.native.enabled=true \
    -Dquarkus.native.container-build=false \
    -Dquarkus.package.jar.enabled=false \
    -Dquarkus.native.native-image-xmx=4g
