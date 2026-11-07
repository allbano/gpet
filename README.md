# GPET — Educação e Tecnologia, Pessoas e Protagonismos

Monólito modular Kotlin/Quarkus/jOOQ/PostgreSQL e SPA Angular. A Home institucional foi preservada. Ensino oferece consulta pública; usuários autenticados gerenciam usuários, categorias, formatos e atividades, com as mesmas permissões.

- [Plano, checklist e evidências](docs/plan/plano_de_implementacao_gpet.md)
- [Arquitetura e testes](docs/arquitetura.md)
- [Operação, TLS, backup e rollback](docs/operacao.md)

## Desenvolvimento

Para executar pelos containers, use Docker/BuildKit e Compose 2.20+ (suporte a `include` e `extends`). O build compila o backend dos fontes com GraalVM CE 25.0.2 dentro do Docker; não requer Java instalado no host nem executável previamente gerado. Para desenvolvimento fora dos containers e testes locais: Java/GraalVM 25.0.2, Node 26.13.0 e npm 12.2.1. A geração jOOQ usa PostgreSQL 18.6 descartável, sem acessar o banco da aplicação.

Toda configuração de ambiente fica em `infra/.env`, ignorado pelo Git. Na primeira instalação, execute `cp infra/.env.example infra/.env` e ajuste os valores; preserve o arquivo caso já exista. Os dois arquivos Compose carregam esse arquivo automaticamente por `include.env_file`; basta escolher o ambiente com `-f`. `npm start`, Playwright e os scripts operacionais o carregam automaticamente. Variáveis exportadas no terminal têm precedência, inclusive no CI. Senhas ficam nos secrets; seus caminhos são configurados no mesmo `.env`.

Senhas novas, temporárias ou redefinidas devem ter de **8 a 64 caracteres**.

```bash
./gpet-backend/gradlew -p gpet-backend test
npm --prefix gpet-frontend ci
npm --prefix gpet-frontend run test:unit
npm --prefix gpet-frontend run build
```

Backend JVM: configure `GPET_DB_DEV_URL`, `GPET_DB_USER` e o caminho do secret em `infra/.env`, então execute `scripts/backend-dev.sh`. As migrations rodam automaticamente apenas nos perfis dev/test. Frontend: `npm --prefix gpet-frontend start`; o proxy encaminha `/api` ao backend na porta 8080.

Para editar o Angular com recarregamento automático, deixe apenas backend e banco nos containers:

```bash
# Na raiz do repositório
docker compose -f compose.dev.yaml stop frontend
docker compose -f compose.dev.yaml up -d --wait backend

# Em outro terminal
cd gpet-frontend
npm start
```

Abra **http://localhost:4200**. O Compose de desenvolvimento publica a API em `127.0.0.1:8080`; o Angular encaminha `/api/**` a essa porta. O banco permanece em `127.0.0.1:15432`. As portas, o host do Angular, o proxy e os demais parâmetros ficam em `infra/.env`; após alterá-lo, reinicie os processos afetados.

O Compose cria a primeira conta `admin` automaticamente quando o banco está vazio, usando o arquivo definido em `GPET_ADMIN_PASSWORD_FILE`. Reiniciar ou reconstruir não altera contas ou senhas existentes. Novas contas recebem senha temporária e precisam trocá-la antes dos cadastros. Após trocar a senha, faça login novamente.

O menu público não contém acesso à administração. Para entrar, digite diretamente `/gpet-admin/login` no navegador, por exemplo `http://localhost:4200/gpet-admin/login` no servidor Angular. O endereço antigo `/login` exibe a página de não encontrado.

## Containers e aceite nativo

```bash
# Crie os secrets e configure TLS conforme docs/operacao.md antes de subir produção.
docker compose -f compose.yaml up -d --build --wait
# Confirme a versão do compilador usado na imagem:
docker compose -f compose.yaml exec backend cat /work/graalvm-build.txt
```

Para desenvolvimento local via NGINX, use `docker compose -f compose.dev.yaml ...` nos comandos de Compose. A aplicação abre em `http://127.0.0.1:8088`; a porta PostgreSQL local é 15432. Esse arquivo usa HTTP e cookies sem Secure apenas no loopback.

Cada ambiente usa um único arquivo de entrada: `compose.yaml` para produção e `compose.dev.yaml` para desenvolvimento. Ambos carregam `infra/.env` e a configuração correspondente em `infra/compose/production.yaml` ou `development.yaml` por `include`. Essas configurações reutilizam os serviços de `infra/compose/services.yaml` por `extends` e os secrets, volumes e redes de `infra/compose/resources.yaml` por `include`. Não combine os dois arquivos com `-f`. O PostgreSQL persiste no caminho absoluto `GPET_POSTGRES_DATA_DIR` (exemplo: `/var/lib/gpet/postgres`), fora dos volumes gerenciados pelo Docker. Os arquivos sobrevivem à recriação dos containers e à remoção de volumes Docker. Preserve esse diretório e os secrets, e faça backups. Instalações anteriores com volume nomeado devem migrar seus dados antes de mudar o armazenamento; veja o guia de operação.

E2E e AXE exigem um projeto descartável separado: configure `COMPOSE_PROJECT_NAME` diferente de `gpet`, `GPET_POSTGRES_DATA_DIR` separado, `GPET_E2E_DISPOSABLE=true`, portas próprias, `GPET_E2E_URL` em loopback e secrets de teste. O Playwright bloqueia a execução no ambiente padrão. Após subir esse projeto com banco novo:

```bash
cd gpet-frontend
npx playwright install chromium
npm run test:e2e
```

O fluxo E2E troca a senha da conta inicial e cria dados fictícios. Execute-o somente em ambiente descartável. O CI prepara esse ambiente automaticamente. Verifique os contratos de infraestrutura com `python3 scripts/test-infra.py` e a proteção E2E com `node --test scripts/e2e-environment.test.cjs`.
