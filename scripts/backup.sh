#!/usr/bin/env bash
set -euo pipefail
umask 077
# shellcheck source=load-env.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/load-env.sh"
cd "$GPET_REPO_DIR"
mkdir -p "$GPET_BACKUP_DIR"
arquivo="$GPET_BACKUP_DIR/gpet-$(date -u +%Y%m%dT%H%M%SZ).dump"
# Exige banco operacional e usa a credencial já montada como secret no container.
docker compose --env-file infra/.env exec -T db sh -c 'export PGPASSWORD="$(cat "$POSTGRES_PASSWORD_FILE")"; exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$arquivo.tmp"
mv "$arquivo.tmp" "$arquivo"
sha256sum "$arquivo" > "$arquivo.sha256"
docker compose --env-file infra/.env exec -T db sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -v ON_ERROR_STOP=1 -c "$1"' sh 'SELECT (SELECT count(*) FROM flyway_schema_history), (SELECT count(*) FROM usuarios), (SELECT count(*) FROM atividades), (SELECT count(*) FROM categorias_atividade), (SELECT count(*) FROM formatos_atividade);' > "$arquivo.counts"
echo "Backup gravado em $arquivo"
