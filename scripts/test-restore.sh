#!/usr/bin/env bash
set -euo pipefail
: "${1:?Uso: scripts/test-restore.sh caminho/backup.dump}"
arquivo=$(realpath "$1")
# shellcheck source=load-env.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/load-env.sh"
container="gpet-restore-$(date +%s)-$$"
limpar() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap limpar EXIT
# Volume efêmero e nome exclusivo: nunca sobrescreve o banco da aplicação.
docker run --detach --rm --name "$container" --tmpfs /var/lib/postgresql -e POSTGRES_HOST_AUTH_METHOD=trust -e "POSTGRES_DB=$GPET_DB_NAME" postgres:18.6-alpine >/dev/null
for _ in {1..60}; do
    if docker exec "$container" pg_isready -U postgres -d "$GPET_DB_NAME" >/dev/null 2>&1; then break; fi
    sleep 1
done
docker exec -i "$container" pg_restore -U postgres -d "$GPET_DB_NAME" --exit-on-error --no-owner < "$arquivo"
docker exec "$container" psql -U postgres -d "$GPET_DB_NAME" -v ON_ERROR_STOP=1 -c 'SELECT count(*) AS migrations FROM flyway_schema_history; SELECT count(*) AS usuarios FROM usuarios; SELECT count(*) AS atividades FROM atividades;'
if [ -f "$arquivo.counts" ]; then
    contagens=$(docker exec "$container" psql -U postgres -d "$GPET_DB_NAME" -At -v ON_ERROR_STOP=1 -c 'SELECT (SELECT count(*) FROM flyway_schema_history), (SELECT count(*) FROM usuarios), (SELECT count(*) FROM atividades), (SELECT count(*) FROM categorias_atividade), (SELECT count(*) FROM formatos_atividade);')
    if [ "$contagens" != "$(cat "$arquivo.counts")" ]; then
        echo 'As contagens restauradas diferem da origem; verifique gravações durante o backup.' >&2
        exit 1
    fi
fi
echo 'Restauração validada em PostgreSQL descartável.'
