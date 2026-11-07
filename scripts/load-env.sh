#!/usr/bin/env bash
# Biblioteca compartilhada pelos scripts operacionais. Requer Bash.
GPET_REPO_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
gpet_carregar_ambiente() {
    local arquivo="$GPET_REPO_DIR/infra/.env" linha chave
    local -A anteriores=()
    if [[ ! -f "$arquivo" ]]; then
        echo 'Crie infra/.env copiando infra/.env.example antes de executar.' >&2
        return 1
    fi
    # Preserva valores fornecidos pelo terminal/CI, inclusive strings vazias.
    while IFS= read -r linha || [[ -n "$linha" ]]; do
        if [[ "$linha" =~ ^([A-Za-z_][A-Za-z0-9_]*)= ]]; then
            chave=${BASH_REMATCH[1]}
            if [[ -v "$chave" ]]; then anteriores["$chave"]=${!chave}; fi
        fi
    done < "$arquivo"
    set -a
    # shellcheck source=../infra/.env.example
    source "$arquivo"
    set +a
    for chave in "${!anteriores[@]}"; do export "$chave=${anteriores[$chave]}"; done
}
gpet_carregar_ambiente
unset -f gpet_carregar_ambiente
