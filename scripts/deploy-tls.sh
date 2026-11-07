#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=load-env.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/load-env.sh"
cd "$GPET_REPO_DIR"
: "${GPET_DEPLOY_DIR:?Defina GPET_DEPLOY_DIR}"
: "${GPET_TLS_DIR:?Defina GPET_TLS_DIR com o diretório absoluto de montagem}"
: "${GPET_CERTBOT_LIVE_DIR:?Defina GPET_CERTBOT_LIVE_DIR com o diretório do certificado emitido}"
install -d -m 0700 "$GPET_TLS_DIR"
# Copia os arquivos reais para evitar symlinks de /etc/letsencrypt quebrados no container.
install -m 0644 "$GPET_CERTBOT_LIVE_DIR/fullchain.pem" "$GPET_TLS_DIR/.fullchain.pem.tmp"
install -m 0600 "$GPET_CERTBOT_LIVE_DIR/privkey.pem" "$GPET_TLS_DIR/.privkey.pem.tmp"
mv "$GPET_TLS_DIR/.fullchain.pem.tmp" "$GPET_TLS_DIR/fullchain.pem"
mv "$GPET_TLS_DIR/.privkey.pem.tmp" "$GPET_TLS_DIR/privkey.pem"
cd "$GPET_DEPLOY_DIR"
if [ -n "$(docker compose --env-file infra/.env ps --status running -q frontend)" ]; then
    docker compose --env-file infra/.env exec -T frontend nginx -t
    docker compose --env-file infra/.env exec -T frontend nginx -s reload
fi
