# Plano de implementação — GPET com monólito modular

**Data:** 2026-11-06
**Status:** Implementação concluída e validada localmente; evidências e pendências de implantação no ANEXO.
**Escopo:** usuários, autenticação, categorias, formatos, atividades de Ensino e navegação pública.

## 1. Decisões consolidadas

Implementar usuários, autenticação, categorias, formatos e atividades de Ensino, preservando a Home existente e disponibilizando navegação pública para todos os menus.

- **Backend:** Kotlin, Quarkus e jOOQ; um único processo organizado por módulos.
- **Banco:** PostgreSQL 18, fixando o patch estável mais recente disponível na implementação.
- **Frontend:** Angular 22 como SPA, com Node.js 26 LTS no build.
- **Infraestrutura:** Docker Compose com containers NGINX/frontend, backend e PostgreSQL.
- **Usuários:** um único tipo; qualquer usuário autenticado gerencia todos os cadastros, inclusive outros usuários.
- **Primeira conta:** login e nome `admin`, criada por bootstrap seguro.
- **Publicação:** atividade salva aparece imediatamente na área pública.
- **Carga horária:** texto livre.
- **Categorias e formatos:** tabelas cadastráveis.
- **Sem enums:** contratos JSON e modelos TypeScript usam valores compatíveis com JavaScript nativo.

A matriz oficial confirma a compatibilidade do Angular 22 com Node 26. As versões exatas serão fixadas no lockfile e nas imagens, sem tags `latest`. Referências: [Compatibilidade Angular](https://angular.dev/reference/versions), [Node.js](https://nodejs.org/en/download), [PostgreSQL](https://www.postgresql.org/support/versioning/).

## 2. Modelagem Kotlin e PostgreSQL

### Composição, sem herança de persistência

Usar um agregado `Atividade`, compartilhando os campos comuns. As diferenças entre informativa e formativa serão verificadas pelas regras de domínio.

Isso evita duplicar CRUDs, consultas e tabelas sem transformar os conteúdos em um CMS genérico baseado em JSON.

Modelo conceitual:

```kotlin
data class Periodo(
    val inicio: LocalDate,
    val fim: LocalDate
)

data class Atividade(
    val id: UUID,
    val natureza: String,
    val categoriaId: UUID,
    val formatoId: UUID,
    val titulo: String,
    val objetivo: String?,
    val descricao: String?,
    val cargaHoraria: String,
    val periodo: Periodo,
    val publicoAlvo: String,
    val versao: Long
)

data class CategoriaAtividade(
    val id: UUID,
    val natureza: String,
    val nome: String,
    val descricao: String,
    val ativo: Boolean
)

data class FormatoAtividade(
    val id: UUID,
    val nome: String,
    val descricao: String,
    val ativo: Boolean
)
```

`natureza` aceita os códigos textuais `informativa` e `formativa`, validados no backend e por `CHECK` no banco. São os dois comportamentos definidos pelo requisito, sem utilizar `enum class`, enum PostgreSQL ou enum TypeScript.

UUID e datas são tipos internos Kotlin; na API serão strings JSON. Nenhum objeto específico de Kotlin ou jOOQ será exposto diretamente.

### Estrutura relacional

| Tabela | Responsabilidade |
|---|---|
| `usuarios` | Nome, login único sem distinção de maiúsculas, hash da senha, ativo e troca obrigatória de senha |
| `sessoes` | Sessões revogáveis, vinculadas ao usuário e com expiração |
| `categorias_atividade` | Natureza, nome, descrição e disponibilidade para novos cadastros |
| `formatos_atividade` | Nome, descrição e disponibilidade para novos cadastros |
| `atividades` | Campos comuns, objetivo/descrição, referências aos catálogos, versão e auditoria |

Regras:

- Informativa exige `objetivo`; formativa exige `descricao`. O campo não aplicável permanece nulo.
- Título, categoria, formato, carga horária, período e público-alvo são obrigatórios.
- Carga horária permanece textual, sem conversão ou somatório.
- Datas usam `DATE`/`LocalDate`, com fim maior ou igual ao início.
- A categoria precisa pertencer à natureza da atividade; garantir também com chave estrangeira composta.
- Nome de categoria é único por natureza; nome de formato é único. Comparação ignora maiúsculas e espaços externos.
- Categoria e formato referenciados são desativados ao excluir. Permanecem visíveis nas atividades existentes, mas indisponíveis para novas associações.
- A natureza da categoria não pode mudar enquanto houver referências.
- Atividades usam exclusão lógica; usuários usam desativação, preservando referências de auditoria.
- Uma coluna de versão impede sobrescritas silenciosas entre usuários: atualização desatualizada retorna `409`.
- Não haverá status editorial nem endpoints de publicação. Consultas públicas retornam atividades não excluídas.

Adicionar UUID, timestamps e identificação do autor das alterações. DTOs públicos omitem dados de usuários e controles internos.

Semear os quatro formatos e as categorias exemplificadas pelo requisito em migrations versionadas. Continuar permitindo sua edição pela interface.

## 3. Backend, autenticação e contratos

### Organização modular

Partir do backend existente em `gpet-backend`, que já declara Quarkus, Kotlin, JDBC PostgreSQL e jOOQ.

Organizar os pacotes sob `br.ufpr.gpet`:

- `identidade`: usuários, senhas, sessões e bootstrap.
- `atividades`: atividades, categorias e formatos.
- `shared`: erros, paginação e infraestrutura transversal mínima.

Cada módulo terá domínio, aplicação, infraestrutura e recursos HTTP. Repositórios jOOQ ficam na infraestrutura; registros gerados não atravessam a fronteira do módulo. Não introduzir Hibernate/Panache.

Adicionar Flyway e geração jOOQ a partir de PostgreSQL 18 temporário com migrations aplicadas. Gerar em diretório de build antes da compilação, sem depender do banco de produção. Usar transações com a conexão gerenciada pelo Quarkus e testar rollback. Referências: [Extensão jOOQ](https://github.com/quarkiverse/quarkus-jooq), [Transações Quarkus](https://quarkus.io/guides/transaction/).

### Autenticação e primeira conta

- Login por nome de usuário e senha; nenhuma rota de cadastro público.
- Sessão com identificador aleatório em cookie `HttpOnly`, `Secure` em produção e `SameSite=Lax`; armazenar somente o hash do identificador no banco.
- Expiração absoluta de oito horas, revogação no logout, desativação ou alteração de senha.
- Proteção CSRF nas operações autenticadas e limitação de tentativas de login.
- Senhas com hash adaptativo, nunca em texto puro.
- Novos usuários recebem senha temporária e devem trocá-la antes de acessar os CRUDs.
- Impedir desativação do último usuário ativo, inclusive sob concorrência.

O bootstrap será um comando operacional executado após as migrations, dentro da imagem do backend. Criará `admin` somente se ainda não houver usuários, com senha fornecida por secret e troca obrigatória no primeiro acesso. Será idempotente, transacional e não redefinirá credenciais existentes.

### Interfaces HTTP

| Base | Operações |
|---|---|
| `/api/v1/auth` | Login, logout, sessão atual e alteração da própria senha |
| `/api/v1/admin/usuarios` | Listagem, criação, edição, desativação e redefinição de senha |
| `/api/v1/admin/atividades` | Listagem, detalhe, criação, edição e exclusão |
| `/api/v1/admin/categorias` | CRUD de categorias |
| `/api/v1/admin/formatos` | CRUD de formatos |
| `/api/v1/public/atividades` | Listagem e detalhe somente para leitura |
| `/api/v1/public/categorias` e `/api/v1/public/formatos` | Opções para filtros públicos |

Todos os endpoints administrativos exigem autenticação, com as mesmas permissões para todos os usuários.

Usar JSON camelCase, UUID textual, datas `YYYY-MM-DD`, OpenAPI e erros padronizados. Listagens terão paginação padrão de 20, limite de 100 e filtros por natureza, categoria, formato e título. Detalhes públicos terão URL estável por UUID; registros excluídos retornarão `404`.

## 4. Angular e containers

### Frontend

Preservar a organização existente em `domains/`, componentes compartilhados, signals, lazy loading e arquivos separados de componente, template e estilo.

Adicionar:

- Login e troca obrigatória de senha.
- Área administrativa com usuários, atividades, categorias e formatos.
- Formulário de atividade compartilhado, exibindo os rótulos específicos de cada natureza.
- Categorias filtradas por natureza e formatos carregados da API.
- Ensino com listagem, filtros e detalhes públicos.
- Estados de carregamento, erro, vazio e conflito de edição.

Utilizar Signal Forms e contratos TypeScript sem enums emitidos em runtime. Guards auxiliam a navegação; a autorização permanece no backend.

Todos os links existentes do menu devem abrir páginas próprias. Substituir o redirecionamento genérico para Home por uma página de não encontrado. Pesquisa, Extensão, Produção e Materiais terão páginas institucionais ou estados vazios honestos até a especificação dos respectivos CRUDs.

Não criar um CRUD de menus nesta entrega.

### Escolha: NGINX

NGINX servirá os arquivos compilados do Angular e encaminhará `/api/` ao Quarkus na mesma origem. O fallback da SPA atenderá apenas rotas de frontend; erros da API não poderão retornar `index.html`.

A escolha se justifica pelo pequeno conjunto fixo de serviços e pela necessidade de servir arquivos estáticos. A descoberta dinâmica do Traefik não traz benefício necessário nesta implantação. Referência: [Documentação NGINX](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy).

- Frontend: build multiestágio com Node 26; imagem final NGINX, sem runtime Node.
- Backend: manter a meta de imagem nativa do plano existente, validando jOOQ e autenticação em testes nativos desde a fundação; JVM no desenvolvimento.
- Banco: PostgreSQL 18 com volume persistente e sem porta pública em produção.
- TLS no NGINX, certificados externos à imagem e renovação automatizada.
- Health checks, logs estruturados, segredos externos e cache longo apenas para assets versionados.
- HTML e respostas autenticadas sem cache compartilhado.
- Migrations como etapa única de deploy, com backup e teste de restauração.

## 5. Sequência de entrega e aceite

1. **Reconciliar documentação e fundação:** este documento substitui a proposta anterior, removendo Panache, SSR, perfis distintos e ciclo editorial, e registra o backend existente. Na implementação, preservar alterações locais já presentes nos arquivos Gradle.
2. **Persistência e segurança:** migrations, geração jOOQ, bootstrap, sessões, usuários e respectivas telas.
3. **Catálogos:** CRUD completo de categorias e formatos, com sementes e integridade referencial.
4. **Atividades e Ensino:** CRUD administrativo e leitura pública imediata, entregues conjuntamente.
5. **Navegação e implantação:** rotas dos demais menus, containers, TLS, CI e procedimentos de backup/rollback.

Testes de aceite:

- Bootstrap repetido e concorrente não duplica `admin` nem altera sua senha.
- Visitantes leem conteúdos, mas não conseguem executar operações administrativas.
- Qualquer usuário autenticado pode gerenciar conteúdos e usuários.
- Desativação revoga sessões; o último usuário ativo não pode ser desativado.
- Login, logout, troca obrigatória e CSRF funcionam.
- Objetivo/descrição, datas e compatibilidade de categoria são validados na API e no banco.
- Carga horária textual é preservada.
- Salvar, editar e excluir refletem imediatamente na leitura pública.
- Catálogos desativados preservam atividades existentes.
- Atualizações concorrentes produzem conflito explícito.
- Testes de integração usam PostgreSQL 18 real, incluindo migrations, jOOQ e rollback.
- E2E verifica criação de usuário, login, CRUD e visualização pública.
- Build Angular, testes nativos, navegação direta via NGINX e acessibilidade AXE/WCAG AA passam.

Biblioteca, Pesquisa, Extensão e Produção permanecem como fases posteriores: seus modelos serão definidos quando os campos e regras forem fornecidos. Esta entrega não pressupõe funcionalidades desses domínios.


## ANEXO — Execução incremental com DDD e TDD

### A. Método de implementação

Adotar **Domain Driven Design (DDD)** no monólito modular. Identidade e Atividades são contextos delimitados; cada contexto separa `domain`, `application`, `infrastructure` e `presentation`. O domínio contém agregados, objetos de valor, invariantes e portas de repositório, sem dependências de HTTP, Angular, Quarkus ou jOOQ. Casos de uso coordenam domínio e persistência. Adaptadores implementam as portas e DTOs delimitam os contratos externos. No frontend, organizar contratos e regras puras em `domain`, serviços em `application`, acesso HTTP em `infrastructure` e componentes em `presentation`.

Executar cada incremento com **Test Driven Development/Design (TDD)**: **Red** (escrever e executar teste que falha por comportamento ausente), **Green** (implementar o necessário para passar) e **Refactor** (melhorar estrutura mantendo os testes verdes). Registrar limitações reais de execução; código escrito não equivale a aceite validado.

- Backend: testes unitários JUnit com repositórios falsos em memória, relógio controlado e dados fictícios; nenhuma dependência de banco para testar invariantes. Integração usa PostgreSQL 18 real para migrations, restrições, consultas, transações e concorrência.
- Frontend: Vitest/TestBed, dados mock tipados e `HttpTestingController`; testar validações, filtros, formulários, guards, estados de erro e chamadas HTTP sem servidor real.
- Mocks e dados fictícios ficam em testes; produção sempre usa API e PostgreSQL. Não incluir senhas reais, credenciais de ambientes reais ou dados pessoais nos fixtures.
- Cada etapa só recebe `[x]` quando a implementação e a verificação descritas estiverem concluídas. Itens não executáveis neste ambiente ficam pendentes com justificativa.

### B. Checklist por etapas menores

#### 1. Fundação e contratos

- [x] Backend: estruturar contextos DDD, erros JSON e paginação; escrever testes unitários antes dos casos de uso.
- [x] Backend: migrations PostgreSQL 18 com integridade, auditoria e sementes; configurar jOOQ, transações e geração no build.
- [x] Frontend: definir contratos TypeScript sem enums e configurar HTTP, mocks e testes unitários.
- [x] Transversal: reconciliar documentação e preservar Home e configuração Gradle existente.

#### 2. Identidade e segurança

- [x] Backend: testar senhas, normalização de login, sessão expirada, revogação e bloqueio da última conta ativa com mocks.
- [x] Backend: implementar bootstrap idempotente, hash adaptativo, sessões de oito horas, cookie, CSRF e limite de tentativas.
- [x] Backend: implementar casos de uso e endpoints de usuários, login, logout, sessão e troca/redefinição de senha.
- [x] Frontend: testar serviço HTTP e guards com sessão mock, inclusive troca obrigatória.
- [x] Frontend: implementar login, troca de senha e gestão de usuários com feedback de erros.

#### 3. Categorias e formatos

- [x] Backend: escrever testes de unicidade, natureza e desativação de catálogos referenciados.
- [x] Backend: implementar repositórios jOOQ e CRUD administrativo; leitura pública para filtros.
- [x] Frontend: testar carregamento mock, validação e falhas HTTP dos catálogos.
- [x] Frontend: implementar listagem, criação, edição e exclusão/desativação de categorias e formatos.

#### 4. Atividades e Ensino

- [x] Backend: testar agregado Atividade, Periodo, objetivo/descrição, carga textual e compatibilidade dos catálogos.
- [x] Backend: implementar CRUD, exclusão lógica, versão concorrente, filtros e DTO público sem auditoria.
- [x] Frontend: testar formulário com ambas as naturezas, categorias filtradas, falhas e conflito 409 usando mocks.
- [x] Frontend: implementar formulário compartilhado, gestão administrativa, Ensino público, filtros e detalhe por UUID.
- [x] Integração: verificar publicação imediata, exclusão, rollback e concorrência com PostgreSQL real.

#### 5. Navegação, implantação e aceite

- [x] Frontend: rotas próprias para todos os menus, página 404 e preservação da Home.
- [x] Infraestrutura: Docker Compose, imagens fixas, NGINX, proxy API, health checks e segredos externos.
- [x] Infraestrutura: configurar TLS e renovação automatizada, migrations únicas, backup, restauração e procedimentos de rollback; validar HTTPS com certificado temporário e restauração em banco descartável.
- [ ] Produção: emitir certificado para o domínio real, configurar os secrets e ativar/verificar o timer de renovação no servidor de destino.
- [x] CI: configurar workflow com testes backend/frontend, integração PostgreSQL, build Angular, testes nativos, E2E e restauração; validar os comandos localmente e a sintaxe YAML.
- [ ] CI remoto: executar o workflow no GitHub após o envio destas alterações ao repositório remoto.
- [x] Aceite: executar E2E de usuário/login/CRUD/leitura pública e AXE/WCAG AA.

### C. Evidências de execução

Validação local em **2026-11-06**, usando dados fictícios e containers isolados:

| Verificação | Resultado |
|---|---|
| Backend JVM — `./gpet-backend/gradlew -p gpet-backend test` | **34 testes aprovados**: 22 unitários e 12 de integração |
| Backend nativo — `testNative -Dquarkus.native.enabled=true -Dquarkus.package.jar.enabled=false` | **6 testes HTTP aprovados** no executável GraalVM |
| Frontend — `npm --prefix gpet-frontend run test:unit` | **48 testes aprovados**, com mocks HTTP e fixtures tipados |
| Angular — `npm --prefix gpet-frontend run build` | Build de produção aprovado, TypeScript e templates estritos |
| Playwright — `npm run test:e2e` | **5 fluxos aprovados** pelo NGINX: navegação pública (incluindo setas, Escape e menu móvel), CRUD completo, acesso administrativo apenas pelo endereço dedicado, login responsivo e erro de autenticação mock |
| AXE | Nenhuma violação nas 17 rotas públicas, no menu móvel e nos formulários/detalhes exercitados; inclui tags WCAG A/AA e 2.1 AA |
| Containers | Imagens Angular/NGINX e backend nativo construídas; migrations e health checks aprovados |
| HTTPS | Certificado temporário verificado, HSTS, redirecionamento HTTP, cookie Secure/HttpOnly/SameSite e erros da API em JSON aprovados |
| Bootstrap operacional | Primeira criação aprovada; repetição preservou a conta e não redefiniu a senha |
| Backup/restauração | Dump restaurado em PostgreSQL 18.6 descartável; contagens de migrations, usuários, atividades e catálogos coincidiram |
| Scripts e CI | ShellCheck e sintaxe dos scripts aprovados; YAML com quatro jobs validado localmente |

**Evidências de TDD:** os testes iniciais de domínio em Kotlin e TypeScript falharam pela ausência das implementações (Red), passaram após a implementação (Green) e foram mantidos na integração. Um teste adicional de teclado reproduziu o fechamento indevido do submenu ao mover o foco; o componente foi corrigido e o teste passou. O cenário adicional no navegador também revelou que a transição CSS de visibilidade impedia o foco imediato por seta; a transferência foi sincronizada com a renderização e a transição de visibilidade removida. Durante a validação real também foram corrigidos o binding de datas de sessão, os valores padrão de DTOs Kotlin/Jackson e a serialização dos erros no executável nativo.

**Cenários verificados:** login/logout, CSRF, senha temporária, revogação de sessão, limitação de tentativas, bootstrap concorrente, proteção do último usuário ativo sob concorrência, rollback jOOQ, constraints PostgreSQL, unicidade de catálogos, natureza da categoria referenciada, associação desativada, conflito 409, publicação imediata e exclusão lógica. O E2E usa visitante em outra sessão para confirmar a leitura pública após criar, editar e excluir.

**Limites do aceite:** AXE é verificação automatizada das telas exercitadas, não uma certificação completa de acessibilidade. A emissão/renovação ACME real e a execução do workflow remoto dependem do domínio/servidor e do envio ao GitHub; os itens correspondentes permanecem pendentes. Não houve publicação em produção nem alteração de bancos externos.

**Operação e decisões:** consulte [arquitetura e testes](../arquitetura.md), [operação e implantação](../operacao.md) e [README](../../README.md). Os formatos e categorias iniciais são editáveis e ficam na migration `V2__catalogos_iniciais.sql`. A Home foi preservada e os CRUDs de Pesquisa, Extensão, Produção, Biblioteca e Materiais continuam fora do escopo, conforme o plano.

### D. Revisão do login e execução por ambiente — 2026-11-06

- [x] Frontend: reconstruir o login conforme o wireframe, com cartão centralizado, logo horizontal, campos Usuário/Senha e ações Voltar/Logar; manter a autenticação e a troca obrigatória de senha.
- [x] Frontend: verificar formulário vazio, envio duplicado, limpeza da senha, redirecionamento e erro de autenticação com testes unitários e respostas HTTP mock.
- [x] Frontend: validar no navegador as larguras de 1029, 390 e 320 px, teclado, retorno à Home e AXE sem violações nas telas exercitadas.
- [x] Infraestrutura: tornar `compose.yaml` e `compose.dev.yaml` entradas executáveis individualmente, compartilhando serviços por `extends` e recursos por `include`, sem `!override` nem combinação de dois `-f`.
- [x] Infraestrutura: validar caminhos, secrets, volumes, perfil ops e isolamento de produção com `config`; executar migrations, bootstrap, health checks e quatro E2E em projeto descartável separado, preservando o banco local.
- [x] Documentação e CI: atualizar os comandos para um arquivo Compose por ambiente e selecionar somente `compose.dev.yaml` no job E2E.

### E. Política de senha e ambiente centralizado — 2026-11-06

- [x] Backend: aceitar senhas novas de 8 a 64 caracteres no bootstrap, criação, redefinição e troca; manter a verificação de credenciais antigas para possibilitar sua atualização.
- [x] TDD: reproduzir a incompatibilidade da regra anterior com testes de limites antes da implementação; aceitar 8/64 e rejeitar 7/65 no domínio, formulários com HTTP mock e contrato HTTP real.
- [x] Frontend: compartilhar os limites no domínio de identidade e atualizar as validações e os textos dos formulários; verificar criação, redefinição, confirmação e limpeza dos campos.
- [x] Infraestrutura: criar `infra/.env` local ignorado pelo Git e `infra/.env.example` versionável; centralizar banco, portas, cookies, imagens, caminhos de secrets, TLS, backup e E2E.
- [x] Infraestrutura: carregar a configuração no Compose com `--env-file infra/.env` e automaticamente em `npm start`, proxy, Playwright e scripts operacionais; preservar a precedência de valores exportados no terminal/CI.
- [x] Integração: aprovar 34 testes JVM, 6 HTTP nativos, 48 unitários frontend e 4 E2E com AXE; validar build Angular, portas dos dois ambientes, execução por npm, ShellCheck e sintaxe do CI.
- [x] Operação: recompilar e atualizar o backend local sem redefinir credenciais; validar bootstrap, backup e restauração apenas no projeto descartável separado, com contagens coincidentes.

### F. Acesso administrativo por endereço dedicado — 2026-11-06

- [x] Frontend: remover Administração do menu público, tanto em desktop como em dispositivos móveis.
- [x] Frontend: disponibilizar o formulário exclusivamente em `/gpet-admin/login` e atualizar guards, logout e retorno após troca de senha; o antigo `/login` exibe página não encontrada.
- [x] TDD e aceite: atualizar os testes de redirecionamento antes da implementação, reproduzir as falhas e aprovar 48 testes unitários, build e 5 E2E pelo NGINX com dados fictícios e AXE.
- [x] Documentação: registrar o novo endereço no README e nas instruções operacionais.

### G. Carregamento automático do ambiente no Compose — 2026-11-06

- [x] Infraestrutura: carregar `infra/.env` nos dois arquivos de entrada usando `include.env_file`, antes de interpolar os serviços e recursos; executar com um único `-f`, sem exigir `--env-file`.
- [x] Infraestrutura: manter os serviços compartilhados e mover apenas as diferenças de cada ambiente para `infra/compose/production.yaml` e `development.yaml`, sem duplicar suas definições.
- [x] Validação: comparar os modelos completos de produção e desenvolvimento com as configurações anteriores; verificar igualdade de imagens, portas, paths, secrets, redes, dependências e volume PostgreSQL.
- [x] Validação: aprovar `config` com perfil ops, chamadas a partir de outro diretório, precedência de variáveis exportadas, isolamento com `-p` e simulação `--dry-run up -d --build` em desenvolvimento.
- [x] Documentação: atualizar os comandos e explicar a seleção de nomes de projeto adicionais pelo CLI.

### H. Usabilidade dos campos e carregamento de estilos — 2026-11-06

- [x] Diagnóstico: reproduzir no Chromium pelo NGINX a ausência de bordas e padding; identificar que o carregador de CSS crítico do build dependia de um script inline bloqueado pela CSP, deixando a folha global com mídia `print`.
- [x] Frontend: desativar apenas `optimization.styles.inlineCritical` no build de produção e carregar diretamente a folha global, mantendo as demais otimizações e os cabeçalhos existentes.
- [x] Frontend: aplicar borda de 2 px, padding de 12/14 px, texto de 16 px, campos com largura integral e altura mínima de 50 px; aumentar os intervalos entre rótulos/campos e tornar foco e botão desabilitado visíveis.
- [x] Regressão: reproduzir a falha antes da correção e aprovar as verificações de borda, padding, dimensões, foco, teclado, ausência de erros CSP e AXE nas larguras de 1029, 390 e 320 px.
- [x] Aceite: aprovar 48 testes unitários, build e 5 E2E; inspecionar capturas desktop/celular e aplicar a imagem corrigida ao frontend local.


### I. Build nativo dentro do Docker — 2026-11-06

- [x] Diagnóstico: o Dockerfile anterior copiava um executável já compilado no host; o Compose não executava a compilação GraalVM e podia reutilizar um artefato antigo.
- [x] Backend/infraestrutura: compilar diretamente dos fontes com GraalVM CE 25.0.2 em build multiestágio; excluir artefatos do host pelo `.dockerignore`.
- [x] Backend: gerar jOOQ em PostgreSQL 18.6 efêmero no próprio builder, sem depender de Docker aninhado, secrets ou banco da aplicação; preservar Testcontainers na geração local.
- [x] Verificação: build Docker concluído, metadados `graalvm-build.txt` confirmam o compilador, aplicação final é ELF nativo e não contém Java no PATH.
- [x] CI/documentação: construir a imagem a partir dos fontes no E2E, sem baixar runner pré-compilado; documentar o comando único de Compose e a consulta da versão do compilador.

### J. Persistência de usuários e senhas após reinstalação do Docker — 2026-11-06

- [x] Diagnóstico: o Docker disponível não apresentava os containers nem o volume nomeado anterior da aplicação. Inspecionar os dois volumes anônimos remanescentes por cópias isoladas: ambos continham somente dados fictícios E2E, sem o banco da instalação. Nenhum foi restaurado sobre a instalação.
- [x] Infraestrutura/TDD: reproduzir a falha do contrato de persistência nos dois Composes antes da alteração e aprovar o contrato após configurar bind mount do PostgreSQL fora dos volumes gerenciados pelo Docker.
- [x] Infraestrutura: centralizar `GPET_POSTGRES_DATA_DIR` como caminho absoluto em `infra/.env`; nesta instalação, `/home/albano/github/gpet/infra/data/postgres`. O exemplo usa `/var/lib/gpet/postgres`. Ignorar os dados locais no Git.
- [x] Backend: inicializar a primeira conta automaticamente pelo serviço operacional `migrate-bootstrap`, antes do backend; manter bootstrap manual e preservar contas existentes, senhas trocadas e versões.
- [x] Backend/TDD: acrescentar teste de integração para preservar a identidade, o hash e a senha definitiva após novo bootstrap; aprovar **35 testes JVM**, incluindo 22 unitários com mocks e 13 integrações PostgreSQL.
- [x] Segurança dos testes: bloquear Playwright sem opt-in, projeto descartável, dados separados e URL em loopback; aprovar **9 testes** desse bloqueio e confirmar a recusa da configuração padrão antes de qualquer navegação.
- [x] Aceite operacional isolado: trocar a senha do admin fictício, repetir bootstrap com o secret inicial antigo, executar `down --volumes`/`up` e comprovar igualdade do registro de credencial e login com a senha trocada.
- [x] Frontend/integração: aprovar novamente **5 E2E com AXE** contra a imagem compilada no Docker, após o aceite de persistência, usando somente dados e credenciais descartáveis.
- [x] Instalação local: criar admin a partir do secret inicial preservado, sem gerar nova senha; validar login, reiniciar com os mesmos arquivos PostgreSQL e comparar identificador/hash/versão sem expor credenciais.
- [x] Backup: gerar dump protegido da instalação local e validar sua restauração em PostgreSQL descartável em tmpfs, sem restaurar sobre o banco ativo; health checks e `/gpet-admin/login` HTTP 200 aprovados.
- [x] Documentação: explicar armazenamento, bootstrap idempotente, proteção E2E e migração de instalações que ainda possuem volume nomeado; registrar no CI o aceite de persistência.

**Limite da recuperação:** o banco/volume anterior da instalação não estava disponível e não foi localizado backup dele. O secret inicial foi preservado e utilizado para restabelecer `admin` no banco novo. Se a senha anterior havia sido alterada pelo usuário, sua recuperação depende de localizar o banco ou backup anterior; ela não pode ser reconstruída a partir do secret inicial. A comparação de persistência local refere-se à conta restabelecida, e não à recuperação do banco ausente.


### K. Fonte da senha do administrador no CI — 2026-11-06

- [x] Conferir o caminho existente `.secrets/admin_password`, os mounts de Compose e as variáveis de bootstrap e Playwright.
- [x] Remover o redirecionamento permanente de `GPET_E2E_PASSWORD_FILE` para `/tmp/gpet-ci/e2e-password` no CI; manter bootstrap e E2E apontando ao mesmo `.secrets/admin_password`.
- [x] Após o aceite de persistência, sincronizar a credencial vigente da conta fictícia com o arquivo do CI, preservando seu inode e o bind mount; manter o secret local da instalação intocado.
- [x] Validar YAML/Python do workflow, os dois modelos Compose e o script real de sincronização em diretório temporário, sem imprimir senhas.
- [ ] Executar o workflow remoto após envio das alterações ao GitHub.
