#!/bin/sh
set -eu
if [ -n "${GPET_DB_PASSWORD_FILE:-}" ]; then
    GPET_DB_PASSWORD=$(cat "$GPET_DB_PASSWORD_FILE")
    export GPET_DB_PASSWORD
fi
exec /work/application "$@"
