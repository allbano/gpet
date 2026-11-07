#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=load-env.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/load-env.sh"
cd "$GPET_REPO_DIR"
: "${GPET_DEPLOY_DIR:?Defina GPET_DEPLOY_DIR com o diretório da implantação}"
: "${GPET_TLS_DIR:?Defina GPET_TLS_DIR}"
: "${GPET_CERTBOT_LIVE_DIR:?Defina GPET_CERTBOT_LIVE_DIR}"
export GPET_DEPLOY_DIR GPET_TLS_DIR GPET_CERTBOT_LIVE_DIR
GPET_DEPLOY_DIR=$(realpath "$GPET_DEPLOY_DIR")
certbot renew --quiet --deploy-hook "$GPET_DEPLOY_DIR/scripts/deploy-tls.sh"
