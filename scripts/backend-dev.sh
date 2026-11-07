#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=load-env.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/load-env.sh"
cd "$GPET_REPO_DIR"
export GPET_DB_URL="$GPET_DB_DEV_URL"
GPET_DB_PASSWORD=$(cat "$GPET_DB_PASSWORD_FILE")
export GPET_DB_PASSWORD
exec ./gpet-backend/gradlew -p gpet-backend quarkusDev "$@"
