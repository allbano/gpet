# GPET backend

Kotlin 2.4.10, Quarkus 3.40.1.1, Java 25 e jOOQ. Os contextos `identidade` e `atividades` separam domínio, aplicação, adaptadores e HTTP. PostgreSQL 18.6 é a persistência real; não há Hibernate/Panache.

A partir desta pasta:

```bash
./gradlew test
../scripts/backend-dev.sh
./gradlew testNative -Dquarkus.native.enabled=true -Dquarkus.package.jar.enabled=false
```

A primeira compilação requer Docker para gerar tipos jOOQ em um PostgreSQL descartável com as migrations aplicadas. Os arquivos gerados ficam no diretório de build. `test` executa testes de domínio e casos de uso com mocks e integração PostgreSQL. `testNative` repete o contrato HTTP no executável compilado com GraalVM 25.0.2.

Para desenvolvimento JVM, copie `infra/.env.example` para `infra/.env` na raiz do repositório e configure ali `GPET_DB_DEV_URL`, `GPET_DB_USER` e `GPET_DB_PASSWORD_FILE`; o script carrega o ambiente e lê a senha do secret; o perfil dev aplica migrations ao iniciar. `./gradlew quarkusBuild` produz `build/quarkus-app/quarkus-run.jar`. No Compose, o serviço `migrate` aplica migrations e inicializa a conta antes de iniciar a aplicação.

Os comandos operacionais `migrate`, `migrate-bootstrap` e `bootstrap` são argumentos do executável ou do JAR. Bootstrap exige `GPET_ADMIN_PASSWORD_FILE` e só cria `admin` quando a tabela de usuários está vazia. A senha inicial precisa ser trocada. `migrate-bootstrap` aplica migrations e executa esse bootstrap idempotente; é o comando usado automaticamente no Compose. Contas, hashes e senhas já trocadas são preservados. Não há senha padrão nem endpoint público de cadastro.

API sob `/api/v1`: `auth`, `admin/usuarios`, `admin/atividades`, `admin/categorias`, `admin/formatos` e consultas `public/*`. JSON usa camelCase; erros usam `codigo`/`mensagem`. Paginação começa em zero, com tamanho padrão 20 e máximo 100. Atualizações/exclusões exigem versão; conflitos retornam 409. Sessão por cookie e mutações autenticadas com `X-CSRF-Token`. Login exige `X-GPET-Request: 1`.

[Plano e evidências](../docs/plan/plano_de_implementacao_gpet.md), [arquitetura](../docs/arquitetura.md) e [operação](../docs/operacao.md). O Compose usa o Dockerfile na raiz desta pasta.

O Dockerfile multiestágio compila dos fontes com GraalVM CE 25.0.2 e executa jOOQ contra um PostgreSQL efêmero do builder. A imagem final contém somente o executável nativo e os recursos de execução, sem JVM nem ferramenta de compilação. `docker compose -f compose.dev.yaml up -d --build` na raiz faz todo o build. Confira `docker compose -f compose.dev.yaml exec backend cat /work/graalvm-build.txt`. O arquivo `.dockerignore` exclui artefatos de build do host. O PostgreSQL da aplicação usa o diretório persistente definido em `GPET_POSTGRES_DATA_DIR`.
