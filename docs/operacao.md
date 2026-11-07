# Operação do GPET

## Preparação

A implantação usa três serviços permanentes (frontend/NGINX, backend nativo e PostgreSQL 18.6) e dois comandos operacionais: `migrate` e `bootstrap`. O banco fica em rede interna e não tem porta pública na configuração de produção. A imagem do backend compila o executável diretamente dos fontes com GraalVM CE 25.0.2 em um estágio de build. O builder gera jOOQ usando um PostgreSQL temporário próprio, sem secrets da aplicação, banco de produção ou socket Docker. A imagem final Ubuntu executa apenas o binário nativo, sem JVM.

Use Compose 2.20+ e apenas um arquivo por comando: `-f compose.yaml` em produção ou `-f compose.dev.yaml` em desenvolvimento. Os serviços são compartilhados por `extends` em `infra/compose/services.yaml`; `include` importa os recursos de `infra/compose/resources.yaml`. Os arquivos de entrada declaram apenas as diferenças de cada ambiente, sem sobreposição de arquivos na linha de comando. Scripts operacionais carregam `infra/.env` e usam o arquivo escolhido em `COMPOSE_FILE`. O exemplo seleciona desenvolvimento; configure `COMPOSE_FILE=compose.yaml` ao implantar em produção.

Na primeira instalação, copie `infra/.env.example` para `infra/.env`. Este é o único arquivo de ambiente da aplicação e fica fora do Git. Ajuste nele projeto, imagens, banco, portas, cookies, caminhos de secrets, TLS, backup e E2E. Caminhos relativos partem da raiz do repositório. Os dois arquivos Compose carregam `infra/.env` automaticamente por `include.env_file`, inclusive para interpolar imagens, portas e caminhos. Os scripts, `npm start` e Playwright também carregam o arquivo automaticamente. Valores exportados têm precedência. O exemplo usa sintaxe compatível com Compose, Node e Bash (`CHAVE=valor`, com aspas quando necessário).

O nome padrão do projeto é `gpet`, preservando os containers e volumes existentes. Para projetos adicionais, use `-p NOME` ou exporte `COMPOSE_PROJECT_NAME` no terminal; as opções de controle do CLI são avaliadas antes do `include`. Os scripts operacionais e o CI continuam lendo `COMPOSE_PROJECT_NAME` e `COMPOSE_FILE` do ambiente central ao preparar o CLI.

A política de senhas novas é de 8 a 64 caracteres, inclusive no bootstrap, criação, redefinição e troca. O login e o campo de senha atual mantêm a leitura de credenciais antigas para permitir que contas existentes atualizem sua senha.

Compile e valide antes de implantar:

```bash
./gpet-backend/gradlew -p gpet-backend test testNative -Dquarkus.native.enabled=true -Dquarkus.package.jar.enabled=false
npm --prefix gpet-frontend ci
npm --prefix gpet-frontend run test:unit
npm --prefix gpet-frontend run build
```

O build Docker usa a arquitetura do servidor e um builder com libc compatível com Ubuntu 26.04 da imagem final. GraalVM no host só é necessária para executar o teste nativo ou compilar fora do Docker. O primeiro build precisa de rede e memória para a compilação nativa (heap de 4 GiB, mais memória para o compilador). O CI também valida GraalVM 25.0.2 em Linux x86_64. O cache Docker pode reutilizar uma compilação quando os fontes não mudaram. O frontend usa Node apenas no build multiestágio; a imagem final executa NGINX.

## Segredos e primeira conta

Crie arquivos de senha fora do controle de versão, preferencialmente provisionados por um gerenciador de segredos. As variáveis `GPET_DB_PASSWORD_FILE` e `GPET_ADMIN_PASSWORD_FILE` apontam a arquivos no host e o Compose os monta em `/run/secrets/`. A senha inicial deve ter de 8 a 64 caracteres. Nunca use credenciais do ambiente de produção em testes.

Exemplo para desenvolvimento descartável:

```bash
mkdir -p .secrets
python3 - <<'PY'
import secrets
from pathlib import Path
for nome in ['db_password', 'admin_password']:
    p = Path('.secrets') / nome
    if p.exists():
        raise SystemExit(f'{p} já existe; senha preservada.')
    p.write_text(secrets.token_urlsafe(32))
    p.chmod(0o644)
PY
chmod 700 .secrets
```

O diretório restrito protege os arquivos no host; o secret precisa ser legível pelo UID 1001 dentro do backend. No Docker Compose local, secrets baseados em arquivo são bind mounts e os campos `uid`/`mode` podem não ser aplicados. Em produção, configure as permissões ou ACLs do provisionamento para esse UID e verifique a leitura no container.

```bash
docker compose -f compose.dev.yaml up -d --build --wait
docker compose -f compose.dev.yaml exec backend cat /work/graalvm-build.txt
```

O serviço `migrate` executa `migrate-bootstrap` e precisa terminar com sucesso antes do backend. Assim, a primeira inicialização já cria nome/login `admin` se a tabela de usuários estiver vazia. O comando manual `docker compose -f compose.dev.yaml --profile ops run --rm bootstrap` continua disponível. Execuções repetidas ou concorrentes não redefinem a senha. A senha inicial vem exclusivamente do arquivo secret e não é impressa. Após trocar a senha, vale a senha armazenada como hash no banco; o secret inicial não é uma senha de recuperação e não deve substituir a credencial atual. Entre diretamente em `/gpet-admin/login`, troque a senha inicial e entre novamente. A aplicação não possui cadastro público.

Para desenvolvimento sem containers do aplicativo, disponibilize PostgreSQL e configure `GPET_DB_DEV_URL`, `GPET_DB_USER` e `GPET_DB_PASSWORD_FILE` em `infra/.env`; execute `scripts/backend-dev.sh`. Para a primeira conta, use o serviço operacional `bootstrap` do Compose mostrado acima, que lê os caminhos desse mesmo arquivo de ambiente.

## Persistência do banco e das credenciais

`GPET_POSTGRES_DATA_DIR=/var/lib/gpet/postgres` monta o diretório absoluto do host em `/var/lib/postgresql` (layout PostgreSQL 18). Use sempre um caminho absoluto: `extends` resolve paths relativos ao arquivo de serviços compartilhados. Nesta instalação local, foi configurado `/home/albano/github/gpet/infra/data/postgres`, ignorado pelo Git. Não compartilhe esse diretório com testes ou com outra instância PostgreSQL. Para produção, escolha um diretório em disco persistente. Reiniciar, reconstruir ou remover volumes Docker não remove esse diretório. Apagar o diretório ou perder o disco exige restauração de backup.

O backend não recebe o secret do administrador. Apenas os comandos operacionais o recebem; o bootstrap usa lock transacional e não modifica usuários existentes. Uma senha já trocada permanece no banco após reinício ou reconstrução. Preserve os arquivos de secrets ao reinstalar. Não gere novas senhas sobre os arquivos existentes.

**Instalações anteriores com volume nomeado:** antes de trocar para o diretório do host, pare as gravações, faça e valide um backup do banco anterior e restaure-o no novo armazenamento. Não remova o volume anterior até validar usuários, hashes e dados restaurados. Se o volume ou o backup não existir mais, não é possível recuperar a senha trocada a partir do secret inicial; um banco novo recebe apenas a conta inicial. Nunca restaure dados fictícios dos testes sobre a instalação.

Os E2E modificam usuários e senhas. A configuração exige `GPET_E2E_DISPOSABLE=true`, projeto diferente de `gpet`, diretório de dados separado e URL de loopback. No CI, os dados ficam em `/tmp/gpet-ci/postgres`. Esses controles são verificados antes de abrir o navegador. O aceite `scripts/test-persistence.py` troca a senha do admin fictício, repete o bootstrap, executa `down --volumes`/`up`, compara o registro persistido e valida o login com a senha trocada. Carregue as variáveis do projeto de teste com `source scripts/load-env.sh` antes de executá-lo e configure `GPET_E2E_PASSWORD_FILE` separado do secret inicial; ele grava nesse arquivo a credencial fictícia para o Playwright.

## Arquivo do administrador no CI

O caminho usado pelo repositório é `.secrets/admin_password`. No job E2E, o runner cria sua própria credencial fictícia nesse arquivo; `GPET_ADMIN_PASSWORD_FILE` e `GPET_E2E_PASSWORD_FILE` apontam para ele. O Compose o monta como `/run/secrets/admin_password` para bootstrap/migrations e o Playwright lê o arquivo no host do runner. O CI não tem acesso ao secret da instalação local.

O aceite de persistência mantém a senha inicial intacta enquanto testa uma troca e a recriação dos containers; seu resultado intermediário fica em `/tmp/gpet-ci/e2e-password`. Após esse aceite, o workflow grava a senha vigente da conta fictícia de volta em `.secrets/admin_password`, preservando o mesmo arquivo montado. Os E2E seguintes leem `.secrets/admin_password`, sem redirecionar sua configuração para o arquivo temporário. Essa sincronização ocorre somente no runner descartável do CI; a troca de senha pela API da instalação continua persistindo o hash no PostgreSQL.

## TLS e renovação

Produção usa `docker compose -f compose.yaml`; desenvolvimento usa `docker compose -f compose.dev.yaml`. O NGINX exige `fullchain.pem` e `privkey.pem` em `GPET_TLS_DIR` (padrão `infra/tls`). Esses arquivos ficam fora da imagem e do Git.

Para a emissão inicial, antes de subir o NGINX HTTPS, use Certbot standalone com a porta 80 livre ou DNS-01. Configure depois a renovação por webroot em `GPET_ACME_DIR`, o mesmo diretório usado pelo Certbot e montado como `/var/www/acme` no NGINX. A rota `/.well-known/acme-challenge/` é pública no HTTP; demais acessos são redirecionados para HTTPS.

Configure `GPET_CERTBOT_LIVE_DIR=/etc/letsencrypt/live/SEU_DOMINIO` e `GPET_TLS_DIR` com um diretório absoluto. Execute `scripts/deploy-tls.sh` após a primeira emissão, antes de subir a produção. O script copia os arquivos reais, aplica permissões e recarrega o NGINX se ele estiver em execução. A renovação chama o mesmo script via deploy-hook, evitando symlinks quebrados dentro do container.

Os modelos `infra/systemd/gpet-tls-renew.service` e `.timer` executam `scripts/renew-tls.sh` duas vezes ao dia com atraso aleatório. Provisionamento no host:

1. Configure os caminhos `GPET_DEPLOY_DIR`, `GPET_TLS_DIR` e `GPET_CERTBOT_LIVE_DIR` em `infra/.env`. No modelo do serviço, ajuste `WorkingDirectory` e `EnvironmentFile` para a instalação real (o exemplo usa `/opt/gpet` e `/opt/gpet/infra/.env`). O mesmo arquivo é carregado pelos scripts manuais.
2. Instale os dois arquivos em `/etc/systemd/system/`.
3. Execute `systemctl daemon-reload` e `systemctl enable --now gpet-tls-renew.timer`.
4. Valide a conta ACME e o webroot com `certbot renew --dry-run`; confira `systemctl list-timers gpet-tls-renew.timer`.

A emissão real, DNS e ativação do timer dependem do domínio e do servidor da implantação. Não fazem parte de uma publicação automática neste repositório. Cookies de sessão são Secure por padrão; `GPET_DEV_COOKIE_SECURE=false` é aplicado apenas pelo Compose de desenvolvimento HTTP em loopback; produção usa `GPET_COOKIE_SECURE=true`.

## Health checks, logs e API

- Backend: `/q/health/ready`, consultado apenas internamente pelo Docker.
- Frontend: `/healthz` em HTTP interno.
- Logs JSON no backend em produção; erros públicos têm `codigo` e `mensagem` sem detalhes internos.
- Assets com hash têm cache longo; HTML e API usam `Cache-Control: no-store`.
- O build Angular usa `optimization.styles.inlineCritical=false` para carregar diretamente a folha CSS global: o carregador inline da otimização seria bloqueado pela CSP do NGINX. Veja a [documentação de segurança do Angular](https://angular.dev/best-practices/security).
- O fallback Angular só atende rotas de frontend. `/api/` é encaminhado ao backend e preserva erros JSON.
- API documentada por OpenAPI no backend; não há proxy público para `/q/` no NGINX.

## Backup e restauração

Antes de qualquer migration de produção, configure `GPET_BACKUP_DIR` em `infra/.env`:

```bash
scripts/backup.sh
scripts/test-restore.sh /diretorio/protegido/gpet-DATA.dump
```

`backup.sh` usa `pg_dump --format=custom`, leitura do secret dentro do container, arquivo temporário, SHA-256 e um arquivo `.counts` para comparar migrations, usuários, atividades e catálogos após restaurar. `test-restore.sh` restaura em PostgreSQL descartável com nome único e sem portas, verifica migrations/contagens e remove apenas esse container. Ele nunca restaura sobre o banco ativo. Ajuste `COMPOSE_PROJECT_NAME`, `COMPOSE_FILE` e as variáveis de secrets quando utilizar outro projeto ou ambiente. Proteja e cifre o armazenamento de backups e configure retenção no host.

Teste operacional de restauração deve comparar as contagens e a versão das migrations com a origem, além de executar consultas de negócio em um ambiente de homologação isolado. Os testes deste repositório fazem isso com dados fictícios; uma rotina de produção precisa incluir os dados e a infraestrutura reais.

## Atualização e rollback

1. Gere uma tag imutável de imagem (`GPET_IMAGE_TAG`), execute CI e mantenha a tag anterior disponível.
2. Faça backup e valide a restauração antes das migrations. Pare gravações com uma janela de manutenção.
3. Construa/obtenha as novas imagens e execute `docker compose -f compose.yaml up --force-recreate migrate`; confirme saída zero. Migrations são versionadas e o Flyway controla o lock.
4. Execute `docker compose -f compose.yaml up -d --wait backend frontend` e verifique health checks e fluxo de login/consulta pública.
5. Se a mudança de schema for retrocompatível, volte `GPET_IMAGE_TAG` e suba as imagens anteriores com `--no-build`. Não execute um `build` com a tag antiga, pois isso a sobrescreveria.
6. Se exigir recuperar dados/schema anteriores, restaure primeiro o dump em um banco novo isolado, valide-o, interrompa os serviços, reconfigure a conexão/volume e só então inicie as imagens compatíveis. Preserve o banco anterior até conferir a recuperação.

Não há down-migrations automáticas nem exclusão de dados em procedimentos de produção. `docker compose down --volumes` aparece apenas na limpeza do ambiente fictício do CI.
