"""Aceite destrutivo somente para uma instalação E2E explicitamente descartável.

Carregue infra/.env antes de executar (scripts/load-env.sh). Nunca usa o banco real.
"""
from http.cookiejar import CookieJar
import json
import os
import subprocess
from pathlib import Path
from urllib.request import HTTPCookieProcessor, Request, build_opener

ROOT = Path(__file__).resolve().parent.parent
subprocess.run([
    "node", "-e",
    "require('./scripts/e2e-environment.cjs').assertDisposableEnvironment(process.env)",
], cwd=ROOT, check=True)

inicial = Path(os.environ["GPET_ADMIN_PASSWORD_FILE"]).resolve()
destino = Path(os.environ["GPET_E2E_PASSWORD_FILE"]).resolve()
if destino == inicial or (destino.exists() and destino.samefile(inicial)):
    raise SystemExit("Use GPET_E2E_PASSWORD_FILE separado do secret inicial: o teste preserva o bootstrap original.")
if destino == (ROOT / ".secrets/admin_password").resolve():
    raise SystemExit("O teste não pode gravar o secret da instalação.")

compose = ["docker", "compose", "--env-file", "infra/.env", "-f", "compose.dev.yaml"]


def executar(*args):
    return subprocess.check_output([*compose, *args], cwd=ROOT, text=True)


def credencial_persistida():
    # O hash é comparado apenas em memória, sem aparecer nos logs.
    return executar("exec", "-T", "db", "sh", "-c",
        'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -v ON_ERROR_STOP=1 -c "$1"',
        "sh", "select id, senha_hash, ativo, trocar_senha, versao from usuarios where login = 'admin'")


def cliente():
    return build_opener(HTTPCookieProcessor(CookieJar()))


def requisitar(http, metodo, rota, dados, csrf=None):
    headers = {"Content-Type": "application/json", "X-GPET-Request": "1"}
    if csrf:
        headers["X-CSRF-Token"] = csrf
    req = Request(os.environ["GPET_E2E_URL"] + rota, json.dumps(dados).encode(), headers, method=metodo)
    with http.open(req, timeout=15) as resp:
        conteudo = resp.read()
        return json.loads(conteudo) if conteudo else None


executar("up", "-d", "--wait")
http = cliente()
senha_inicial = inicial.read_text().rstrip("\r\n")
sessao = requisitar(http, "POST", "/api/v1/auth/login", {"login": "admin", "senha": senha_inicial})
assert sessao["usuario"]["trocarSenha"], "Execute este aceite em banco de teste novo."
senha_definitiva = "Persistencia8"
requisitar(http, "PUT", "/api/v1/auth/senha",
    {"senhaAtual": senha_inicial, "novaSenha": senha_definitiva}, sessao["csrfToken"])
antes = credencial_persistida()
assert antes.strip(), "Administrador não foi persistido."

# O secret ainda contém a senha inicial; repetir não pode desfazer a troca.
executar("--profile", "ops", "run", "--rm", "bootstrap")
assert antes == credencial_persistida(), "Bootstrap alterou a credencial existente."

# Prova que remover containers/volumes Docker preserva o diretório do host.
executar("down", "--volumes")
executar("up", "-d", "--wait")
assert antes == credencial_persistida(), "Recriação alterou o usuário ou a senha persistidos."
sessao = requisitar(cliente(), "POST", "/api/v1/auth/login", {"login": "admin", "senha": senha_definitiva})
assert not sessao["usuario"]["trocarSenha"]

destino.parent.mkdir(parents=True, exist_ok=True)
fd = os.open(destino, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, "w") as arquivo:
    arquivo.write(senha_definitiva)
print("Persistência aprovada: mesmo admin/hash após bootstrap e down --volumes/up; login com a senha trocada aprovado.")
