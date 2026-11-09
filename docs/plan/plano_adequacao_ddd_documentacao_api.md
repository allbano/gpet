# Plano de adequação DDD e documentação da API

**Data:** 2026-11-09  
**Status:** Implementação concluída; 44 testes JVM e 11 testes nativos aprovados; validação manual local pendente por indisponibilidade do PostgreSQL de desenvolvimento  
**Escopo:** backend Kotlin/Quarkus, organização DDD e documentação OpenAPI/Swagger

## 1. Objetivo

Planejar uma refatoração incremental da estrutura do backend para melhorar o alinhamento a Domain Driven Design e, sobre essa estrutura estabilizada, completar a documentação da API com OpenAPI/Swagger.

O trabalho futuro deverá preservar o comportamento atual da API, as regras de negócio, o modelo relacional e o frontend. Este documento registra somente o planejamento; nenhuma das mudanças descritas está implementada por sua criação.

## 2. Diagnóstico da situação atual

### 2.1 Estrutura já aderente a DDD

O backend já possui uma base adequada de monólito modular:

- `br.ufpr.gpet.identidade` concentra usuários, credenciais, sessões e bootstrap.
- `br.ufpr.gpet.atividades` concentra Atividade, Categoria e Formato.
- `br.ufpr.gpet.shared` contém paginação, erros e infraestrutura transversal.
- Cada contexto possui pacotes `domain`, `application`, `infrastructure` e `presentation`.
- `Atividade`, `Categoria`, `Formato` e `Usuario` validam invariantes em sua construção.
- `Periodo` representa um value object com sua própria regra de consistência.
- As portas de repositório estão no domínio e os adaptadores jOOQ estão na infraestrutura.
- Os serviços `GestaoAtividades` e `GestaoIdentidade` coordenam transações e casos de uso.
- Registros jOOQ não são expostos diretamente pelos endpoints.

Essas decisões devem ser preservadas. A refatoração não será uma reescrita nem uma tentativa de tornar todas as classes “ricas” artificialmente.

### 2.2 Pontos estruturais a corrigir

| Ponto | Evidência atual | Correção planejada |
|---|---|---|
| Apresentação consulta persistência diretamente | `AtividadesResource.kt`, `CatalogosResource.kt` e `UsuariosResource.kt` injetam repositórios | Expor consultas nos serviços de aplicação e remover repositórios dos resources |
| Criação e edição são diferenciadas por flags | `GestaoAtividades.salvar(..., nova)` e métodos equivalentes | Criar casos de uso explícitos para criação e edição |
| Identidade do agregado é criada na apresentação | Resources chamam `UUID.randomUUID()` | Gerar o identificador na aplicação durante o caso de uso de criação |
| Uma porta reúne três agregados | `RepositorioAtividades` em `atividades/domain/Atividade.kt:55` | Separar portas de Atividade, Categoria e Formato |
| Dependência entre apresentações de módulos | `atividades.presentation` importa `identidade.presentation.IdentidadeAtual` | Disponibilizar o contexto autenticado por contrato de aplicação de `identidade` |
| Regra de aplicação está na camada HTTP | `LimiteLogin` está em `AuthResource.kt` | Mover a coordenação do limite para a aplicação |
| Criptografia está concentrada no serviço de aplicação | Geração e hash de tokens em `GestaoIdentidade.kt` | Isolar operações criptográficas atrás de portas e adaptadores |
| Domínio conhece status HTTP | `shared/domain/Falha.kt` contém `status` | Usar exceções semânticas e mapear status somente na apresentação |
| Infraestrutura valida filtros durante a consulta | `AtividadesJooq.atividades()` chama validações de domínio | Validar filtros na entrada do caso de uso e manter o adapter como tradutor de consulta |
| OpenAPI existe, mas está incompleto | Dependência presente e somente título/versão configurados | Documentar operações, DTOs, erros, segurança e exposição por ambiente |

### 2.3 Fatos confirmados para o plano de Swagger

A dependência `io.quarkus:quarkus-smallrye-openapi` já existe em `gpet-backend/build.gradle.kts:24`. Portanto, não é necessário implantar outro gerador de especificação.

O planejamento anterior foi revisado contra o código e os testes. As seguintes correções são obrigatórias:

- As criações retornam **200**, não 201.
- As edições retornam **200** com o DTO atualizado.
- Exclusões de atividades, categorias e formatos retornam **204**.
- A desativação de usuário por DELETE retorna **200** com `UsuarioDto`.
- Logout e troca da própria senha retornam **204**.
- O login pode retornar **429** pelo limite de tentativas.
- Mutações autenticadas podem retornar **403** por CSRF; qualquer operação administrativa, inclusive GET, pode retornar **403** por troca obrigatória de senha.
- O login exige o cabeçalho `X-GPET-Request: 1`.
- A autenticação usa o cookie `GPET_SESSION`; mutações autenticadas também exigem `X-CSRF-Token`.
- Login define `Set-Cookie`; logout e troca da própria senha limpam o cookie com valor vazio e `Max-Age=0`. O cookie usa `Path=/`, `HttpOnly`, `SameSite=Lax` e `Secure` conforme o ambiente.
- O corpo de erro utiliza `ErroHttp(codigo, mensagem)`. Além das falhas de negócio, `WebApplicationException` produz `requisicao_invalida`, preserva o status JAX-RS e usa `Recurso não encontrado.` para 404 ou `Requisição inválida.` nos demais casos.
- `Paginacao` aceita página entre 0 e 1.000.000 e tamanho entre 1 e 100.
- Senhas novas têm de 8 a 64 caracteres; senha de login e senha atual aceitam até 1024 caracteres para preservar credenciais antigas.
- Não há anotações `@Operation`, `@Tag`, `@Schema` ou `@APIResponse` nos fontes atuais.

## 3. Escopo e restrições

A implementação futura deverá:

- preservar rotas, métodos HTTP, payloads JSON, cookies, cabeçalhos, mensagens e status;
- preservar regras de autenticação, CSRF, concorrência otimista, exclusão e publicação;
- evitar migrations e mudanças no PostgreSQL;
- evitar alterações no Angular e nos contratos TypeScript;
- manter jOOQ, Flyway, Quarkus e Kotlin;
- evitar novas dependências apenas para documentar ou validar a arquitetura;
- manter cada etapa compilável e coberta pelos testes existentes;
- atualizar a documentação arquitetural quando uma regra de estrutura for efetivamente alterada.

Não fazem parte desta entrega: novos endpoints, mudança de autenticação para JWT/OAuth, autorização por papéis, versionamento novo da API, geração de cliente Angular ou publicação pública da documentação administrativa.

## 4. Arquitetura DDD desejada

### 4.1 Regras de dependência

A direção das dependências deverá seguir este modelo:

```text
HTTP
  |
  v
presentation ---> application ---> domain
                       ^              ^
                       |              |
                       └── infrastructure
                            (adaptadores e portas técnicas)
```

Regras práticas:

- `domain` não depende de JAX-RS, Quarkus, jOOQ, JDBC ou status HTTP.
- `application` coordena casos de uso, transações, autorização contextual e portas; não conhece DTOs HTTP.
- `infrastructure` implementa persistência, criptografia e demais detalhes técnicos.
- `presentation` recebe/serealiza HTTP e converte DTOs; pode conhecer modelos de domínio para mapeamento, mas não acessa repositórios.
- Um contexto não importa a apresentação de outro. O contexto `atividades` consumirá apenas o contrato de identidade autenticada necessário ao caso de uso.
- `shared.domain` permanece independente de tecnologia e contém apenas conceitos realmente compartilhados.

### 4.2 Casos de uso e consultas

Os services de aplicação passarão a oferecer operações explícitas para todos os usos HTTP:

- listar e detalhar atividades administrativas e públicas;
- criar, editar e excluir atividades;
- listar e detalhar categorias e formatos administrativos e públicos;
- criar, editar e excluir/desativar categorias e formatos;
- listar, detalhar, criar, editar, desativar e redefinir senha de usuários;
- autenticar, consultar sessão, encerrar sessão e trocar a própria senha.

Entradas de comando da aplicação serão usadas quando evitarem que a apresentação monte agregados ou conheça flags de persistência. DTOs como `AtividadeEntrada` continuarão na apresentação; o resource os converterá em comandos ou parâmetros do caso de uso.

A criação deverá gerar o UUID na aplicação. Na criação e na edição, a aplicação deverá construir e validar o agregado candidato **antes** de carregar o estado persistido ou verificar sua versão, preservando a precedência atual: payload inválido continua retornando 400 mesmo quando o ID não existe ou a versão está desatualizada. Somente depois desse primeiro passo a edição carregará o estado atual, verificará a versão, validará as associações considerando o estado anterior e persistirá. As flags `nova` e `novo` deixarão de fazer parte da API dos casos de uso.

As consultas retornarão modelos de domínio ou modelos de leitura da aplicação, nunca DTOs da apresentação. A paginação continuará usando `Pagina<T>` e `Paginacao`. As consultas públicas de atividades, tanto listagem quanto detalhe, retornarão um modelo de leitura que já contenha `categoriaNome` e `formatoNome`; a apresentação não fará consultas complementares nem preencherá nomes vazios.

### 4.3 Portas por agregado

A porta `RepositorioAtividades` será dividida em:

- `RepositorioAtividades`: consultas e persistência de Atividade;
- `RepositorioCategorias`: consultas e persistência de Categoria;
- `RepositorioFormatos`: consultas e persistência de Formato.

Inicialmente, `AtividadesJooq` poderá implementar as três interfaces. Isso melhora os contratos consumidos pela aplicação sem exigir três adapters ou duplicar consultas. A separação física do adapter só deverá ocorrer se a classe permanecer excessivamente acoplada após a divisão das portas.

A separação entre persistência de usuários e sessões será avaliada pelo mesmo critério. Não será feita apenas para aumentar o número de arquivos.

### 4.4 Limites de identidade e serviços técnicos

O contexto do usuário autenticado deixará de pertencer à apresentação consumida por outro módulo. Um contrato em `identidade.application` disponibilizará somente o usuário/sessão exigido pelos casos de uso.

Os filtros JAX-RS, cookies e cabeçalhos permanecerão em `identidade.presentation`. `LimiteLogin` será tratado como regra de aplicação, com relógio injetado e armazenamento em memória preservado nesta etapa.

Geração de token aleatório e cálculo de hash serão isolados por portas adequadas à aplicação/domínio e implementados na infraestrutura. O serviço de identidade continuará coordenando expiração, revogação e autenticação, sem depender diretamente de `SecureRandom`, SHA-256 ou Base64.

### 4.5 Exceções semânticas e tradução HTTP

`Falha(status, codigo, mensagem)` será substituída por falhas semânticas sem status HTTP. A apresentação fará o mapeamento estável:

| Falha semântica | HTTP | Código JSON preservado |
|---|---:|---|
| Validação de entrada/invariante | 400 | `validacao` |
| Registro ausente | 404 | `nao_encontrado` |
| Versão desatualizada | 409 | `conflito` |
| Nome/login duplicado | 409 | `duplicado` ou `login_duplicado`, conforme o caso atual |
| Referência/associação inválida | 409 | `referenciado` |
| Credenciais inválidas | 401 | `credenciais_invalidas` |
| Sessão ausente/expirada | 401 | `nao_autenticado` |
| CSRF inválido | 403 | `csrf_invalido` |
| Troca de senha obrigatória | 403 | `troca_obrigatoria` |
| Limite de login | 429 | `limite_login` |
| Erro JAX-RS de rota, método, content-type, JSON ou parâmetro | Status original de `WebApplicationException` | `requisicao_invalida` |
| Falha não tratada | 500 | `erro_interno` |

O ramo de `WebApplicationException` deverá coexistir com as falhas semânticas e preservar também as mensagens atuais: `Recurso não encontrado.` para 404 e `Requisição inválida.` nos demais status. O conhecimento de SQLState e `DataAccessException` deverá ficar na fronteira de infraestrutura, com tradução para falhas semânticas. `ErrosHttp` continuará como o ponto central de tradução e serialização de `ErroHttp`, sem espalhar status pelo domínio. O filtro `SegurancaHttp` deixará de montar sua própria resposta de erro: ao interceptar a requisição, capturará as falhas semânticas esperadas e delegará ao mesmo tradutor usado por `ErrosHttp` para abortar com status, código e mensagem idênticos aos atuais.

### 4.6 Invariantes e filtros

As validações já existentes nos construtores serão mantidas. Novos métodos de comportamento só serão introduzidos quando eliminarem duplicação ou impedirem transições inválidas de forma clara.

Regras que exigem vários registros, lock ou transação — como impedir a desativação do último usuário ativo — continuarão na aplicação, apoiadas pelas portas.

`FiltroAtividade` deverá validar natureza e tamanho do título ao ser criado para o caso de uso, preservando exatamente os casos-limite atuais: título totalmente em branco é ignorado; para título não branco, o limite de 300 caracteres é aplicado ao comprimento original e somente depois o valor é aparado para a consulta. Assim, 301 espaços continuam ignorados e um espaço seguido de 300 letras continua retornando 400. As consultas administrativas e públicas de categorias também validarão `natureza` na entrada do caso de uso antes de chamar a persistência. `Paginacao` continuará garantindo página entre 0 e 1.000.000 e tamanho entre 1 e 100. O adapter jOOQ apenas converterá filtros válidos em condições SQL; as validações de natureza das categorias e de todos os campos de `FiltroAtividade` serão removidas dele somente depois de suas substitutas estarem cobertas por testes.

## 5. Sequência de implementação DDD

### Etapa 1 — Caracterização do comportamento

Antes da refatoração, ampliar somente os testes necessários para cobrir lacunas do contrato atual: payloads de erro (incluindo `requisicao_invalida`), limites e casos-limite de todos os filtros, códigos de resposta, precedência entre payload inválido/ID ausente/versão desatualizada, requisitos de segurança e atributos/limpeza de `Set-Cookie`. Os testes de caracterização devem passar contra o código original e continuar passando após cada movimento estrutural.

### Etapa 2 — Remoção do acesso HTTP aos repositórios

Adicionar as consultas na aplicação e trocar as chamadas dos resources sem alterar DTOs ou respostas. Introduzir o modelo de leitura pública enriquecido com os nomes de categoria e formato antes de remover o repositório de `AtividadesPublicasResource`. Esta etapa não deve ser combinada com mudanças no banco.

### Etapa 3 — Comandos explícitos e portas por agregado

Separar criação/edição, mover geração de UUID e dividir as portas de Atividade, Categoria e Formato. Ajustar fakes e também os testes de integração que injetam `RepositorioAtividades` ou chamam os métodos antigos, como `PersistenciaTest`, preservando todos os cenários. Testes de caracterização devem fixar a validação do candidato antes do carregamento e da checagem de versão.

### Etapa 4 — Limites de módulos e serviços técnicos

Corrigir a dependência entre `atividades` e `identidade.presentation`, reposicionar `LimiteLogin` e isolar as operações criptográficas. Validar especialmente login, sessão, logout e revogação.

### Etapa 5 — Exceções independentes de HTTP

Introduzir falhas semânticas e o mapeamento centralizado em pequenos incrementos, incluindo explicitamente `SegurancaHttp` e o ramo de `WebApplicationException`. Migrar asserções que acessam `Falha.status`, construções de `GestaoIdentidade` usadas pelos testes e expectativas de exceções de persistência sem remover cenários: testes que atravessam a fronteira traduzida passarão a esperar a falha semântica equivalente; testes deliberadamente abaixo dessa fronteira poderão continuar verificando a exceção técnica. Comparar status, código e mensagem de cada erro antes e depois. Não alterar mensagens para “melhorar texto” durante esta refatoração.

### Etapa 6 — Revisão arquitetural

Revisar imports e responsabilidades, remover adaptações temporárias e atualizar `docs/arquitetura.md`. A verificação deve comprovar que o domínio não importa tecnologias e que os resources não injetam repositórios.

## 6. Plano de documentação OpenAPI/Swagger

### 6.1 Configuração global

Manter `quarkus-smallrye-openapi` e completar os metadados existentes:

- título e versão atuais;
- descrição objetiva da API e do ambiente;
- contato e licença somente se houver valores institucionais confirmados;
- servidores por ambiente sem segredos ou endereços internos indevidos;
- tags para Autenticação, Usuários, Atividades administrativas, Atividades públicas, Catálogos administrativos e Catálogos públicos.

Evitar duplicar metadados conflitantes entre `application.properties` e anotações globais. Uma única fonte deverá prevalecer para cada informação.

### 6.2 Resources e operações

Documentar `AuthResource`, `UsuariosResource`, `AtividadesResource`, `AtividadesPublicasResource`, `CategoriasResource`, `FormatosResource` e `CatalogosPublicosResource` com:

- `@Tag` coerente com o agrupamento global;
- `@Operation` com resumo e descrição úteis;
- `@Parameter` para path/query/header, incluindo obrigatoriedade, limites e exemplos;
- `@RequestBody` quando a descrição do payload acrescentar informação;
- `@APIResponse` para sucesso e erros realmente possíveis;
- schemas de resposta fiéis ao retorno, inclusive respostas vazias 204.

Parâmetros de listagem devem informar página padrão 0, mínima 0 e máxima 1.000.000, tamanho padrão 20, mínimo 1 e máximo 100, além dos filtros por natureza, categoria, formato e título onde aplicáveis. Os testes deverão verificar todos esses limites. `versao` deve ser explicada como controle de concorrência otimista, não como versão pública do conteúdo.

### 6.3 DTOs, paginação e erros

Aplicar `@Schema` às entradas e saídas com descrições, obrigatoriedade, formatos e exemplos fictícios:

- UUID com formato UUID;
- `LocalDate` como data `YYYY-MM-DD`;
- `Instant` como data-hora;
- limites de texto alinhados às regras do domínio;
- campos condicionais `objetivo` e `descricao` explicados por natureza;
- senhas presentes somente nos schemas de entrada: `novaSenha` e `senhaTemporaria` com 8 a 64 caracteres; `LoginEntrada.senha` e `TrocaSenhaEntrada.senhaAtual` com máximo de 1024 e sem mínimo de 8, preservando credenciais antigas;
- `Pagina<T>` com `itens`, `total`, `pagina` e `tamanho`, incluindo os limites máximos de página e tamanho;
- `ErroHttp` com `codigo` e `mensagem`, referenciado nas respostas de erro.

Não adicionar `quarkus-hibernate-validator` somente para produzir documentação. Se a validação for introduzida futuramente por necessidade funcional, os schemas deverão ser reconciliados com ela.

### 6.4 Segurança da API

Declarar dois esquemas de segurança:

- `GPET_SESSION`: API key em cookie para a sessão autenticada;
- `X-CSRF-Token`: API key em cabeçalho para mutações autenticadas.

Leituras administrativas exigirão somente o esquema de sessão e não exigirão CSRF, mas documentarão 403 `troca_obrigatoria`, pois a restrição vale também para GET. POST, PUT e DELETE autenticados exigirão sessão e CSRF em conjunto; nas rotas administrativas também documentarão `troca_obrigatoria`, sem aplicar essa última regra indiscriminadamente a `/auth/sessao`, `/auth/logout` e `/auth/senha`. Login e rotas públicas não terão requisito de sessão.

O login documentará `X-GPET-Request: 1` como parâmetro de cabeçalho obrigatório e o cabeçalho de resposta `Set-Cookie` que cria `GPET_SESSION`. Logout e troca da própria senha documentarão `Set-Cookie` com valor vazio e `Max-Age=0`. As descrições registrarão `Path=/`, `HttpOnly`, `SameSite=Lax` e `Secure` conforme o ambiente, sem incluir valores reais de token nos exemplos. O schema JSON de resposta não incluirá `senhaHash`, identificador/hash da sessão ou o valor do cookie de autenticação. O token CSRF continuará documentado no `SessaoDto`, pois já integra o contrato atual.

### 6.5 Exposição por ambiente

Nesta entrega, “desenvolvimento” significa especificamente o backend local executado por `scripts/backend-dev.sh`/`quarkusDev`, e “testes” significa a suíte JVM `@QuarkusTest` com perfil `test`:

- `/q/swagger-ui` para inspeção manual no desenvolvimento local;
- `/q/openapi` no desenvolvimento local e nos testes JVM;
- ambos desabilitados no perfil `prod` por configuração explícita de build;
- `compose.dev.yaml` e `compose.yaml` executam o binário nativo no perfil `prod`; portanto, **nenhum dos dois Compose disponibilizará Swagger UI ou OpenAPI nesta entrega**. Não se usará `%dev` como se configurasse o Compose de desenvolvimento.

Não haverá alteração no NGINX nem criação de um segundo artefato nativo nesta etapa. O acesso manual será direto ao backend local em `http://localhost:8080/q/swagger-ui` e `http://localhost:8080/q/openapi`, e não pela origem do Angular ou do NGINX, que não possuem proxy para `/q/`. Uma futura exposição no Compose de desenvolvimento ou em produção exigirá decisão explícita, estratégia de build/perfil, avaliação do conteúdo administrativo e proteção adequada. Não se deve assumir que ocultar rotas na UI constitui controle de acesso.

### 6.6 Testes da especificação

Adicionar testes JVM `@QuarkusTest` que consumam `/q/openapi` no perfil `test` e verifiquem:

- presença de todas as rotas atuais;
- tags, servidores e metadados definidos;
- métodos e códigos de resposta corretos, incluindo 403 em GETs administrativos e `requisicao_invalida` onde aplicável;
- schemas de sucesso, erro e paginação;
- parâmetros obrigatórios, formatos e todos os limites, inclusive `pagina <= 1000000`;
- esquemas de sessão e CSRF nas operações corretas;
- cabeçalhos `Set-Cookie` documentados sem valores sensíveis;
- ausência de campos sensíveis.

Os testes positivos da especificação ficarão na suíte JVM e não serão herdados por `ApiResourceIT`: o `testNative` padrão executa em `prod`, onde a especificação deve estar desabilitada. Um teste nativo específico verificará a indisponibilidade de `/q/openapi` e `/q/swagger-ui` no binário de produção. Se propriedades de build impedirem uma asserção HTTP confiável da UI, a verificação complementar será feita inspecionando o artefato/configuração de build, sem fingir que o teste JVM com perfil `test` cobre `prod`.

A especificação será testada por seus elementos essenciais, sem snapshot integral frágil que exija atualização a cada texto alterado. Um `openapi.json` gerado não será versionado nesta primeira entrega.

## 7. Verificação e critérios de aceite

### 7.1 Verificação automatizada

Executar após cada etapa e ao final:

```bash
./gpet-backend/gradlew -p gpet-backend test
```

Como resources JAX-RS e serialização serão alterados, repetir o contrato HTTP de negócio no executável nativo e acrescentar a verificação negativa da documentação em `prod`:

```bash
./gpet-backend/gradlew -p gpet-backend testNative \
  -Dquarkus.native.enabled=true \
  -Dquarkus.package.jar.enabled=false
```

Os testes existentes devem continuar aprovados sem remoção de cenários. Novos testes de aplicação e do conteúdo OpenAPI devem ser incluídos na suíte JVM padrão; a suíte nativa não executará os testes positivos de OpenAPI em `prod`, mas validará explicitamente a indisponibilidade da documentação e manterá o contrato de negócio. A matriz final será: `test` JVM = especificação presente e correta; `prod` nativo = especificação/UI ausentes e API de negócio preservada.

### 7.2 Verificação estrutural

Revisar os fontes para confirmar:

- nenhum resource injeta repositório;
- nenhum modelo de domínio contém status HTTP ou imports JAX-RS/jOOQ;
- `atividades` não depende de `identidade.presentation`;
- portas são consumidas pela aplicação e implementadas pela infraestrutura;
- DTOs HTTP não atravessam os casos de uso;
- contratos e mensagens permanecem compatíveis.

### 7.3 Verificação manual da documentação

Com `scripts/backend-dev.sh` em execução, abrir diretamente `http://localhost:8080/q/swagger-ui` e `http://localhost:8080/q/openapi` e conferir:

- agrupamento e descrições das operações;
- exemplos renderizados para DTOs e paginação;
- respostas 200, 204, 400, 401, 403, 404, 409 e 429 onde aplicáveis;
- fluxo público sem autenticação;
- login com `X-GPET-Request`, obtenção do cookie e leitura do CSRF;
- operação administrativa autenticada, sem registrar ou expor credenciais reais;
- ausência da UI e do spec no perfil de produção.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Quebra silenciosa do contrato durante a refatoração | Testes de caracterização antes das mudanças e execução após cada etapa |
| Grande changeset difícil de revisar | Separar consultas, comandos, portas, identidade, exceções e OpenAPI em fatias pequenas, testando e revisando o diff após cada etapa |
| Divergência entre schemas e regras do domínio | Exemplos baseados nas validações reais e testes da especificação |
| Exposição de dados ou rotas administrativas | UI/spec desabilitados em produção e testes de campos sensíveis |
| Excesso de interfaces e classes sem benefício | Dividir portas por agregado, mas permitir adapter jOOQ compartilhado inicialmente |
| Testes frágeis da documentação | Verificar contrato essencial em vez de snapshot textual completo |
| Mudança acidental de mensagens de erro | Comparar código, mensagem e status no mapeamento de exceções |

## 9. Resultado esperado

Ao concluir a implementação futura, o backend deverá conservar exatamente o comportamento funcional atual, mas com casos de uso como única porta de entrada da apresentação, domínio independente de HTTP, portas coesas por agregado e dependências explícitas entre os módulos.

A API deverá possuir documentação OpenAPI completa e testada, com Swagger UI disponível apenas nos ambientes definidos, exemplos úteis, contratos de erro e segurança fiéis ao sistema e nenhum dado sensível exposto.

# Anexo 

## Checklist consolidado de implementação

### A. Preparação e caracterização

- [x] Executar a suíte atual e registrar a linha de base antes de modificar o código.
- [x] Revisar os contratos HTTP existentes e acrescentar apenas os testes de caracterização necessários para erros, filtros e segurança.
- [x] Cobrir `requisicao_invalida`, 403 em GET administrativo com troca obrigatória e precedência de payload inválido sobre ID ausente/versão desatualizada.
- [x] Cobrir natureza inválida em categorias administrativas/públicas, título em branco e limite medido antes de `trim`, além de `pagina=1000000` e `pagina=1000001`.
- [x] Cobrir criação e limpeza de `Set-Cookie`, incluindo `Path`, `HttpOnly`, `SameSite`, `Max-Age` e `Secure` conforme o perfil.
- [x] Confirmar que os testes novos passam contra a implementação original.
- [x] Registrar as rotas, payloads, status, mensagens, cookies e cabeçalhos que devem permanecer invariantes.

### B. Fronteiras de aplicação DDD

- [x] Adicionar consultas administrativas e públicas aos serviços de aplicação de atividades e catálogos.
- [x] Retornar na listagem e no detalhe públicos um modelo de leitura com `categoriaNome` e `formatoNome`.
- [x] Adicionar consultas de usuários ao serviço de aplicação de identidade.
- [x] Remover as injeções de repositório de todos os resources.
- [x] Substituir os métodos `salvar(..., nova/novo)` por casos de uso explícitos de criação e edição.
- [x] Mover a geração de UUID dos resources para os casos de uso de criação.
- [x] Construir e validar o agregado candidato antes de carregar o registro ou verificar a versão nas edições, preservando a precedência atual dos erros.
- [x] Manter DTOs HTTP fora da aplicação e registros jOOQ fora do domínio e da apresentação.
- [x] Executar os testes após cada grupo de endpoints migrado.

### C. Portas, módulos e exceções

- [x] Separar as portas `RepositorioAtividades`, `RepositorioCategorias` e `RepositorioFormatos`.
- [x] Adaptar `AtividadesJooq` para implementar as novas portas sem alterar o banco.
- [x] Avaliar a separação das portas de usuários e sessões por benefício real de acoplamento.
- [x] Atualizar fakes, testes unitários e testes de integração/injeção afetados, incluindo `PersistenciaTest`, testes de concorrência e construção de `GestaoIdentidade`, sem remover cenários.
- [x] Substituir a dependência de `identidade.presentation.IdentidadeAtual` por contrato de aplicação.
- [x] Mover `LimiteLogin` para a fronteira de aplicação sem mudar seus limites ou janela de tempo.
- [x] Isolar geração e hash de tokens por portas com implementações na infraestrutura.
- [x] Validar `FiltroAtividade` e `Paginacao` na entrada dos casos de uso, incluindo `pagina <= 1000000` e os casos-limite exatos do título.
- [x] Validar `natureza` nas consultas administrativas e públicas de categorias.
- [x] Remover validações de entrada duplicadas das consultas jOOQ somente após cobrir todas as substitutas na aplicação.
- [x] Substituir `Falha` com status por exceções semânticas independentes de HTTP.
- [x] Concentrar a tradução de exceções de persistência na infraestrutura.
- [x] Mapear todas as falhas semânticas para os mesmos status, códigos e mensagens atuais em `ErrosHttp`.
- [x] Preservar o ramo `WebApplicationException`/`requisicao_invalida` e delegar os erros interceptados por `SegurancaHttp` ao tradutor central.
- [x] Migrar asserções de `Falha.status` e expectativas de exceções técnicas conforme a fronteira exercitada por cada teste.
- [x] Revisar os imports e confirmar que o domínio não depende de JAX-RS, jOOQ ou JDBC.

### D. Configuração global OpenAPI

- [x] Manter a extensão `quarkus-smallrye-openapi` sem adicionar outro gerador de especificação.
- [x] Completar descrição e metadados institucionais confirmados da API.
- [x] Configurar servidores por ambiente sem segredos ou endereços internos indevidos.
- [x] Definir tags globais para autenticação, usuários, atividades e catálogos públicos/administrativos.
- [x] Eliminar duplicação conflitante entre propriedades e anotações globais.

### E. Resources, DTOs, erros e segurança

- [x] Documentar todas as operações de `AuthResource`, incluindo login, sessão, logout e troca de senha.
- [x] Documentar todas as operações de `UsuariosResource`, incluindo desativação e redefinição de senha.
- [x] Documentar atividades administrativas e públicas com seus filtros e respostas.
- [x] Documentar categorias e formatos administrativos e públicos com seus filtros e respostas.
- [x] Documentar página padrão 0 entre 0 e 1.000.000, tamanho padrão 20 entre 1 e 100 e concorrência otimista por `versao`.
- [x] Declarar retorno 200 para criações/edições e desativação de usuário.
- [x] Declarar retorno 204 somente nas operações que atualmente não possuem corpo.
- [x] Declarar respostas 400, 401, 403, 404, 409 e 429 apenas onde aplicáveis, incluindo 403 por troca obrigatória nos GETs administrativos.
- [x] Preservar/documentar `requisicao_invalida` para erros JAX-RS sem confundi-lo com `nao_encontrado` de negócio.
- [x] Anotar DTOs de entrada e saída com descrições, formatos, limites e exemplos fictícios.
- [x] Documentar as regras condicionais de `objetivo` e `descricao` por natureza.
- [x] Aplicar 8–64 somente a senhas novas e máximo 1024 sem mínimo de 8 à senha de login/atual.
- [x] Documentar `Pagina<T>` e verificar a representação dos seus tipos concretos.
- [x] Documentar `ErroHttp` e referenciá-lo nas respostas de erro.
- [x] Declarar `GPET_SESSION` como API key em cookie.
- [x] Declarar `X-CSRF-Token` como API key em cabeçalho para mutações autenticadas.
- [x] Exigir sessão e CSRF em conjunto nas operações autenticadas de escrita.
- [x] Documentar `X-GPET-Request: 1` como cabeçalho obrigatório do login.
- [x] Documentar `Set-Cookie` no login e sua limpeza no logout/troca de senha, sem exemplos com tokens reais.
- [x] Manter login e rotas públicas sem requisito de sessão.
- [x] Verificar que schemas não expõem hash de senha, token/hash da sessão ou outros dados internos.

### F. Exposição da documentação

- [x] Disponibilizar Swagger UI no desenvolvimento local via `quarkusDev` e OpenAPI dinâmico no desenvolvimento local/testes JVM.
- [x] Desabilitar explicitamente Swagger UI e OpenAPI dinâmico no perfil `prod` em build time.
- [x] Registrar que `compose.dev.yaml` e `compose.yaml` usam `prod` e, nesta entrega, ambos ficam sem documentação; não tratar `%dev` como configuração do Compose.
- [x] Confirmar que nenhuma rota de documentação é liberada pelo NGINX de desenvolvimento ou produção.
- [x] Documentar acesso manual direto em `http://localhost:8080/q/swagger-ui` e `/q/openapi`, sem usar Angular/NGINX como proxy.
- [x] Registrar que futura exposição em Compose ou produção exige decisão de segurança e estratégia específica de build/perfil.
- [x] Evitar versionar `openapi.json` gerado nesta primeira entrega.

### G. Testes e aceite

- [x] Adicionar testes JVM da especificação para todas as rotas e métodos atuais.
- [x] Testar metadados, tags, parâmetros, schemas, respostas e requisitos de segurança essenciais, incluindo limites de página e políticas distintas de senha.
- [x] Testar a ausência de campos sensíveis e a documentação segura de `Set-Cookie`.
- [x] Manter os testes positivos de OpenAPI fora da herança de `ApiResourceIT`, pois o nativo executa em `prod`.
- [x] Validar no `testNative` a indisponibilidade de OpenAPI/Swagger UI em `prod`, complementando propriedades de build pelo modo apropriado.
- [x] Evitar snapshots integrais frágeis da especificação.
- [x] Executar `./gpet-backend/gradlew -p gpet-backend test` com todos os testes aprovados.
- [x] Executar o contrato HTTP nativo de negócio e as asserções negativas de documentação com `testNative` e as propriedades definidas neste plano.
- [ ] Abrir diretamente `http://localhost:8080/q/swagger-ui` e validar manualmente exemplos, filtros, erros e agrupamento. **Pendente:** PostgreSQL local indisponível; UI validada por teste JVM.
- [ ] Exercitar em desenvolvimento o fluxo público e o fluxo autenticado com cookie e CSRF usando somente dados fictícios. **Pendente:** PostgreSQL local indisponível; fluxos validados nas suítes JVM e nativa.
- [x] Comparar o comportamento anterior e final para confirmar que não houve alteração funcional.

### H. Documentação e revisão final

- [x] Atualizar `docs/arquitetura.md` com as dependências e responsabilidades efetivamente implementadas.
- [x] Atualizar `docs/operacao.md` com o acesso direto ao backend local, a ausência de proxy `/q/` e a indisponibilidade da documentação nos dois Compose nesta entrega.
- [x] Registrar a convenção de documentar novos endpoints e alterar testes/contratos no mesmo changeset.
- [x] Remover adaptações temporárias e comentários que descrevam a estrutura anterior.
- [x] Revisar o diff para garantir ausência de mudanças no frontend, migrations e regras de negócio.
- [x] Verificar arquivos gerados pelos builds e remover somente artefatos temporários criados pela verificação que não pertençam à entrega.
- [x] Submeter a implementação à revisão somente após todos os testes e validações aplicáveis estarem aprovados.

## Registro de verificação

- Linha de base: `./gpet-backend/gradlew -p gpet-backend test --rerun-tasks --console=plain` — aprovada antes das mudanças.
- Verificação final JVM: `./gpet-backend/gradlew -p gpet-backend test --console=plain` — 44 testes, nenhum skipped/failure/error.
- Verificação final nativa: `./gpet-backend/gradlew -p gpet-backend testNative -Dquarkus.native.enabled=true -Dquarkus.package.jar.enabled=false --console=plain` — 11 testes aprovados, incluindo 404 em `/q/openapi` e `/q/swagger-ui` em `prod`.
- Revisão estrutural: nenhum repositório/UUID gerado nos resources, nenhum import JAX-RS/jOOQ/JDBC/OpenAPI no domínio e nenhuma dependência de `atividades` para `identidade.presentation`.
- Escopo do diff: frontend, infraestrutura e migrations não alterados; nenhum `openapi.json` gerado foi versionado.
- A inspeção manual em `quarkusDev` não pôde ser concluída porque `127.0.0.1:15432` recusou conexão. O processo foi encerrado sem alterar a infraestrutura. A UI respondeu 200 com `SwaggerUIBundle` no teste JVM e os fluxos fictícios foram exercidos nas suítes JVM/nativa.
