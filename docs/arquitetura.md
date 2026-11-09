# Arquitetura e verificação

## DDD no monólito modular

`br.ufpr.gpet.identidade` cuida de usuários, credenciais, sessões e bootstrap. `br.ufpr.gpet.atividades` cuida dos agregados Atividade, Categoria e Formato. Cada contexto possui domínio, aplicação, infraestrutura e apresentação HTTP. `shared` contém erros, paginação e infraestrutura mínima. Não há Hibernate, Panache, herança de persistência, perfis distintos ou status editorial.

O domínio depende somente de Kotlin/JDK e define portas coesas de Atividade, Categoria, Formato e Identidade. Os casos de uso transacionais coordenam os agregados por comandos explícitos de criação/edição, geram UUIDs e preservam a validação do candidato antes do carregamento. Resources convertem DTOs HTTP e não injetam repositórios. Consultas públicas de atividades usam modelo de leitura com nomes de categoria e formato. Adaptadores jOOQ usam tabelas geradas em `build/generated-src/jooq`, traduzem exceções técnicas para falhas semânticas e não expõem registros gerados pelos endpoints. O status HTTP e o corpo `ErroHttp` são atribuídos centralmente na apresentação; o domínio não conhece JAX-RS, jOOQ ou JDBC. DTOs públicos omitem versões, hashes, sessões, auditoria e dados de usuários. Naturezas são códigos textuais validados; não há enums na API nem no TypeScript.

`atividades` consome apenas `identidade.application.IdentidadeAtual`, sem importar a apresentação de identidade. Filtros JAX-RS e cookies permanecem na apresentação; limite de login e coordenação de sessões ficam na aplicação. Tokens aleatórios e seus hashes passam pela porta `Tokens`, implementada por `TokensCriptograficos` na infraestrutura.

O frontend mantém `domains/` e `shared/`, com regras puras e contratos tipados no domínio, serviços de aplicação para identidade, adaptadores HTTP e componentes com arquivos separados. Signal Forms controla formulários; signals mantêm estado local; rotas carregam componentes sob demanda. Testes mock ficam em `src/testing` e arquivos `.spec.ts`, nunca na produção.

## Segurança e concorrência

Senhas usam PBKDF2-HMAC-SHA256, salt aleatório de 128 bits e 600 mil iterações. O token de sessão tem 256 bits aleatórios; apenas SHA-256 do token é persistido. Sessões expiram em oito horas e são revogadas no logout, desativação, troca e redefinição de senha. Cookies usam HttpOnly, SameSite=Lax e Secure em produção.

Mutações autenticadas exigem CSRF. Login JSON exige cabeçalho de aplicação; não há CORS liberado. A limitação de tentativas atua por login e globalmente no único processo; reiniciar o backend reinicia esse contador. Todos os recursos administrativos verificam sessão e troca obrigatória no servidor. Guards são conveniência de navegação.

Um lock transacional PostgreSQL serializa bootstrap e alterações de identidade; a primeira conta e o último usuário ativo ficam protegidos sob concorrência. Versões tornam as atualizações otimistas: apenas uma gravação por versão, com 409 para conflitos. Triggers e FKs protegem natureza e associações de catálogos; exclusão preserva referências existentes. Migrations adicionam índices e auditoria de autoria.

## TDD e testes

O ANEXO do plano registra o ciclo Red/Green/Refactor e a verificação final. Testes unitários JUnit exercitam domínio e casos de uso com portas falsas em memória, senhas mock e relógio fixo. Testes reais da implementação de senhas verificam salt, validação e credencial incorreta. Não se substitui banco real por mocks em testes de persistência.

`./gpet-backend/gradlew -p gpet-backend test` executa testes unitários e integração PostgreSQL 18.6: migrations, HTTP, CSRF, restrições, unicidade, publicação imediata, rollback, bootstrap concorrente, última conta ativa, conflito de edição e o conteúdo essencial do OpenAPI no perfil `test`. `testNative -Dquarkus.native.enabled=true -Dquarkus.package.jar.enabled=false` repete o contrato HTTP no executável nativo em `prod` e verifica que `/q/openapi` e `/q/swagger-ui` não estão disponíveis. Testes positivos do OpenAPI não são herdados pelo teste nativo, pois seus perfis têm objetivos opostos.

`npm --prefix gpet-frontend run test:unit` executa Vitest/TestBed com `HttpTestingController`, serviços mock e fixtures tipados. Inclui domínio, guards, sessão, endpoints, paginação de catálogos, erros de rede, 409 e formulários. `npm --prefix gpet-frontend run build` valida TypeScript e templates estritos.

Playwright em `gpet-frontend/e2e` executa navegação direta pelo NGINX, separação do fallback SPA/API, usuário, login, troca, catálogos, criação/edição/exclusão e consulta pública em sessão de visitante separada. AXE verifica WCAG A/AA e 2.1 AA nas rotas e formulários exercitados; auditoria automatizada não substitui avaliação manual completa de acessibilidade.

## Documentação da API

`ApiDocumentacao` centraliza metadados, tags e os esquemas de segurança `GPET_SESSION` (cookie) e `X-CSRF-Token` (cabeçalho). Anotações nos resources descrevem operações, respostas e parâmetros; DTOs de apresentação descrevem formatos e limites sem introduzir dependências de OpenAPI no domínio. Escritas autenticadas usam `SecurityRequirementsSet` para exigir sessão e CSRF em conjunto. Login, logout e troca de senha documentam `Set-Cookie` sem exemplos de credenciais ou tokens reais.

O endpoint `/q/openapi` e a especificação são exercidos em JVM no perfil `test`. `%prod.quarkus.smallrye-openapi.enabled=false` e `%prod.quarkus.swagger-ui.enabled=false` impedem sua exposição no binário de produção. Novos endpoints devem incluir documentação e testes de contrato no mesmo changeset.

Referências usadas nas correções: [Quarkus Kotlin/Jackson](https://quarkus.io/guides/kotlin/), [transações Quarkus](https://quarkus.io/guides/transaction/), [OpenAPI e Swagger UI no Quarkus 3.40](https://quarkus.io/version/3.40/guides/openapi-swaggerui/), [perfis em testes nativos](https://quarkus.io/version/3.40/guides/building-native-image#profiles), [Testcontainers 1.21.4 e Docker](https://github.com/testcontainers/testcontainers-java/releases/tag/1.21.4).

## Compilação e persistência operacional

O build Docker compila o backend com GraalVM CE 25.0.2, gera jOOQ em PostgreSQL temporário do builder e copia somente o executável nativo para a imagem final. Não consome binários gerados no host. O serviço operacional `migrate` executa `migrate-bootstrap` antes do backend; o bootstrap não altera uma conta existente. O PostgreSQL da aplicação persiste fora dos volumes Docker em `GPET_POSTGRES_DATA_DIR`, preservando hashes e usuários na recriação dos containers. Testes E2E exigem opt-in e armazenamento separado; os contratos de configuração dos dois ambientes são verificados por `scripts/test-infra.py`.
