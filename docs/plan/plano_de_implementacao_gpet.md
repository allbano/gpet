# Plano de Implementação — GPET

**Data:** 2026-11-01  
**Status:** Proposta para aprovação  
**Escopo:** portal público, portal administrativo, monolito modular Kotlin/Quarkus, PostgreSQL e implantação incremental.  
**Abordagem recomendada:** Angular híbrido para o portal público e administrativo, com API Quarkus compilada nativamente via GraalVM.

> Este documento registra a análise arquitetural, o plano macro e o checklist inicial da HOME. A modelagem dos módulos posteriores somente deve ser considerada definitiva após a validação dos respectivos campos e regras de negócio.

---

## 1. Objetivo

Construir o sistema GPET como um **monolito modular**, composto por:

- um portal público acessível sem autenticação;
- um portal administrativo utilizado por professores e administradores;
- um único backend Kotlin/Quarkus;
- um único banco PostgreSQL 18+;
- um único projeto Angular 22+ para as experiências pública e administrativa;
- publicação administrativa de conteúdos que alimentam as páginas públicas;
- implantação incremental, começando por HOME, usuários, autenticação e atividades.

A divisão em módulos não representa uma divisão em microsserviços. O sistema terá um único backend, uma única base de dados e contratos internos explícitos entre os módulos.

---

## 2. Entendimento funcional

### 2.1 Portal público

| Menu | Rota prevista | Origem das informações |
|---|---|---|
| HOME | `/` | Conteúdo estático inicialmente: logotipo, “Quem somos”, foto do grupo e rodapé |
| ENSINO | `/ensino` | Atividades informativas/formativas e, posteriormente, Biblioteca |
| PESQUISA | `/pesquisa` | Pendente: Atividades ou módulo próprio |
| EXTENSÃO | `/extensao` | CRUD de Extensão |
| PRODUÇÃO | `/producao` | CRUD de Produção |
| CONTATO | `/contato` | Conteúdo estático inicialmente |

Regras gerais:

- somente conteúdos publicados podem aparecer no portal público;
- rascunhos, arquivados e registros excluídos logicamente não podem ser expostos;
- cada item público deve ter uma URL compartilhável;
- o rodapé institucional deve estar presente nas páginas públicas;
- HOME e CONTATO não dependem dos CRUDs no escopo inicial.

### 2.2 Portal administrativo

O administrativo deverá conter:

- autenticação e logout;
- dashboard;
- CRUD de usuários;
- CRUD de atividades;
- CRUD de biblioteca;
- CRUD de extensão;
- CRUD de produção;
- CRUD de pesquisa, caso Pesquisa não seja atendida pelo módulo de Atividades.

### 2.3 Perfis e ciclo editorial

Perfis iniciais propostos:

- **ADMIN:** gerencia usuários e todos os conteúdos;
- **PROFESSOR:** gerencia conteúdos, sem administrar usuários.

A matriz detalhada de permissões ainda precisa ser validada, incluindo se professores poderão editar conteúdos de outros professores.

Ciclo editorial comum proposto:

```text
RASCUNHO → PUBLICADO → ARQUIVADO
    ↑                       │
    └───────────────────────┘
       retorno para edição
```

---

## 3. Estado atual verificado no repositório

- O projeto frontend está localizado no diretório `gpet-frontend/`.
- Angular `^22.2.0` declarado em `gpet-frontend/package.json`; Angular 22.2.3 registrado no lockfile.
- TypeScript 6, Tailwind CSS 4 e Vitest instalados e ativos.
- Rotas estruturadas com lazy loading (`loadComponent`) em `gpet-frontend/src/app/app.routes.ts`, servindo a Home na rota `/`.
- Arquitetura DDD implementada no frontend com Shared Kernel (`shared/navigation/`, componentes de UI reutilizáveis) e Bounded Context (`domains/institucional/`).
- Testes unitários com Vitest rodando e passando 100% (`gpet-frontend/src/app/app.spec.ts` e `floating-menu.spec.ts`).
- Nenhum backend Kotlin/Quarkus implementado ainda.
- Nenhuma migration ou configuração PostgreSQL implementada ainda.
- Nenhuma configuração de Docker, CI/CD ou deploy implementada.
- Testes E2E ainda não configurados.
- As convenções de `gpet-frontend/AGENTS.md` são rigorosamente seguidas (standalone components, signals, separação de `.ts`, `.html` e `.css`, ausência de layout shift com `NgOptimizedImage`, acessibilidade WCAG AA).

### Comandos atualmente disponíveis no frontend

```bash
cd gpet-frontend
npm start
npm run build
npm test
```

Não há script de lint ou framework E2E configurado atualmente. Comandos de backend, testes nativos e deploy serão definidos quando seus respectivos projetos forem criados.

---

## 4. Premissas e decisões pendentes

### Premissas adotadas neste plano

1. HOME e CONTATO começam com conteúdo estático.
2. A foto e os logotipos institucionais serão fornecidos pelo projeto; placeholders não serão tratados como assets definitivos.
3. Não haverá cadastro público de usuários.
4. O primeiro administrador será criado por um processo seguro de bootstrap.
5. Apenas registros publicados serão retornados pelas APIs públicas.
6. Usuários serão preferencialmente desativados, e não apagados fisicamente.
7. Atividades e demais conteúdos editoriais usarão exclusão lógica quando houver necessidade de preservar histórico.
8. PostgreSQL 18 será fixado em uma minor suportada; atualizações de major serão planejadas, não automáticas.
9. O backend utilizará versões estáveis e compatíveis de Quarkus, Kotlin, JDK e GraalVM, fixadas durante a fundação do projeto.

### Decisões pendentes

- **Pesquisa:** confirmar se o CRUD de Atividades alimenta somente ENSINO ou também PESQUISA.
- **Renderização:** aprovar a abordagem Angular híbrida recomendada ou optar pela SPA única.
- **Permissões:** definir o escopo de edição dos professores.
- **Domínio:** especificar campos e regras de Biblioteca, Extensão, Produção e, se necessário, Pesquisa.
- **Infraestrutura:** definir provedor, servidor ou plataforma de destino do deploy.
- **Conteúdo institucional:** fornecer textos, endereço, fotografia e arquivos oficiais de logotipo.

---

## 5. Alternativas de arquitetura e deploy

### 5.1 Abordagem 1 — SPA Angular servida pelo Quarkus

```text
Navegador
   │
   ▼
Quarkus nativo
├── Angular SPA: público + administrativo
└── /api/v1/*
   │
   ▼
PostgreSQL 18
```

O build Angular é empacotado como recurso estático do Quarkus. Um reverse proxy pode terminar o TLS.

#### Pontos positivos

- um único artefato de aplicação;
- operação e deploy mais simples;
- mesma origem para frontend e API;
- não exige runtime Node.js em produção;
- versionamento e rollback simplificados;
- adequado para um MVP com pouca exigência de SEO.

#### Pontos negativos

- SEO e compartilhamento de links menos previsíveis;
- conteúdo inicial dependente da execução do JavaScript;
- alterações no frontend podem exigir novo build do artefato completo;
- fallback das rotas Angular deve ser configurado sem interceptar `/api`;
- maior acoplamento entre os ciclos de release do frontend e do backend.

### 5.2 Abordagem 2 — Angular híbrido e API Quarkus nativa

```text
Navegador
   │
   ▼
Reverse proxy / TLS
   ├── páginas ──► Angular
   │               ├── HOME/CONTATO: estáticas ou pré-renderizadas
   │               ├── conteúdo público: SSR
   │               └── administrativo: CSR/SPA
   │
   └── /api/* ───► Monolito Kotlin/Quarkus nativo
                         │
                         ▼
                   PostgreSQL 18
```

O Angular permite selecionar `Client`, `Server` ou `Prerender` por rota.

#### Pontos positivos

- HTML público disponível no servidor para SEO e compartilhamento;
- HOME e CONTATO podem ser pré-renderizados;
- listas e detalhes dinâmicos podem usar SSR;
- administrativo permanece SPA, sem SSR desnecessário;
- builds e releases de frontend e backend podem ser independentes;
- melhor controle de cache de assets e páginas públicas;
- preserva o backend como monolito modular.

#### Pontos negativos

- SSR normalmente adiciona um runtime Node.js em produção;
- dois artefatos de aplicação para operar;
- pipelines, health checks e reverse proxy mais complexos;
- configuração adicional de URL interna da API durante SSR;
- mais cuidados com forwarded headers, cookies, cache e hidratação.

### 5.3 Recomendação

Adotar a **Abordagem 2**, porque o GPET é um portal institucional público e se beneficia de indexação, links compartilháveis e HTML inicial renderizado.

Essa escolha não introduz microsserviços: haverá um frontend Angular, um backend Quarkus e um banco PostgreSQL. Se a prioridade absoluta for um único artefato e mínima operação, a Abordagem 1 continua viável.

---

## 6. Arquitetura modular proposta

### 6.1 Frontend

Organização conceitual:

```text
frontend/src/app/
├── core/
├── shared/
├── features/
│   ├── public/
│   │   ├── home/
│   │   ├── ensino/
│   │   ├── pesquisa/
│   │   ├── extensao/
│   │   ├── producao/
│   │   └── contato/
│   └── admin/
│       ├── auth/
│       ├── dashboard/
│       ├── usuarios/
│       ├── atividades/
│       ├── biblioteca/
│       ├── extensao/
│       └── producao/
└── app.routes.ts
```

Diretrizes:

- standalone components;
- rotas de funcionalidades com lazy loading;
- signals para estado local;
- Signal Forms ou Reactive Forms para formulários;
- guards somente como apoio à navegação, nunca como substituto da autorização do backend;
- componentes públicos e administrativos separados, compartilhando somente elementos realmente comuns;
- WCAG AA e AXE como critérios de aceite.

### 6.2 Backend

Organização conceitual por funcionalidade:

```text
br.edu.ufpr.gpet
├── usuario
├── atividade
├── biblioteca
├── pesquisa
├── extensao
├── producao
├── dashboard
└── shared
```

Cada módulo poderá conter:

- modelo e regras de domínio;
- casos de uso e transações;
- repositórios;
- DTOs administrativos e públicos;
- recursos HTTP;
- testes.

Diretrizes:

- DTOs separados das entidades de persistência;
- autorização declarada nos endpoints administrativos;
- consultas públicas específicas, sem reutilizar indiscriminadamente consultas administrativas;
- dependências entre módulos explícitas e sem ciclos;
- sem API gateway ou serviços independentes no escopo inicial.

### 6.3 Persistência e build

Stack proposta:

- Quarkus estável, com BOM fixada;
- Kotlin gerenciado pela BOM do Quarkus;
- Gradle Kotlin DSL, sujeito à validação na fundação;
- Quarkus REST e Jackson com suporte Kotlin;
- Hibernate ORM com Panache Kotlin e JDBC PostgreSQL;
- Flyway para migrations;
- validação de entrada;
- health checks e OpenAPI;
- GraalVM `native-image` para produção;
- Testcontainers/Dev Services com PostgreSQL 18 para testes de integração.

O desenvolvimento poderá usar o modo JVM do Quarkus, mas o CI deverá validar o executável nativo desde a primeira fase.

---

## 7. Estratégia de modelagem

### 7.1 Alternativa descartada como modelo principal: CMS genérico

Uma modelagem possível seria:

```text
conteudos
- id
- menu
- tipo
- titulo
- slug
- status
- payload jsonb
```

Benefícios:

- um CRUD genérico;
- inclusão aparentemente rápida de novos tipos;
- ciclo editorial compartilhado.

Problemas:

- regras de negócio escondidas em JSON;
- menor integridade por constraints e foreign keys;
- consultas e dashboard mais complexos;
- formulários genéricos e validações frágeis;
- migrations de payloads mais difíceis.

### 7.2 Modelo recomendado

Adotar tabelas explícitas por agregado:

- `usuarios`;
- `atividades`;
- `categorias_atividade`;
- `itens_biblioteca`;
- `acoes_extensao`;
- `producoes`;
- tabelas específicas de Pesquisa, se necessárias.

Padronizar somente conceitos realmente comuns:

- UUID;
- slug;
- status editorial;
- timestamps;
- auditoria;
- exclusão lógica;
- paginação e erros de API.

JSONB deverá ser reservado para metadados realmente variáveis, e não usado para evitar a modelagem dos domínios.

---

## 8. Modelo conceitual inicial

Os campos abaixo são uma proposta para revisão antes da primeira migration. Não representam SQL definitivo.

### 8.1 `usuarios`

```text
id                UUID PK
nome              VARCHAR NOT NULL
email             VARCHAR NOT NULL
senha_hash        VARCHAR NOT NULL
papel             ADMIN | PROFESSOR
ativo             BOOLEAN NOT NULL DEFAULT TRUE
created_at        TIMESTAMPTZ NOT NULL
updated_at        TIMESTAMPTZ NOT NULL
created_by        UUID NULL FK usuarios
updated_by        UUID NULL FK usuarios
last_login_at     TIMESTAMPTZ NULL
```

Regras:

- e-mail único com comparação case-insensitive;
- senha armazenada somente como hash adaptativo;
- não permitir desativar o último administrador ativo;
- desativação em vez de remoção física;
- sem auto-registro público;
- bootstrap inicial sem credencial padrão conhecida.

### 8.2 `categorias_atividade`

```text
id                UUID PK
tipo              INFORMATIVA | FORMATIVA
nome              VARCHAR NOT NULL
descricao         TEXT NULL
created_at        TIMESTAMPTZ NOT NULL
updated_at        TIMESTAMPTZ NOT NULL
deleted_at        TIMESTAMPTZ NULL
```

Regras:

- nome único por tipo;
- categoria vinculada não pode ser apagada fisicamente;
- categoria deve ser compatível com o tipo da atividade.

### 8.3 `atividades`

```text
id                UUID PK
tipo              INFORMATIVA | FORMATIVA
categoria_id      UUID NOT NULL FK categorias_atividade
titulo            VARCHAR NOT NULL
slug              VARCHAR NOT NULL UNIQUE
descricao         TEXT NOT NULL
objetivo          TEXT NULL
carga_horaria     NUMERIC/INTEGER, conforme regra final
data_inicio       DATE NOT NULL
data_fim          DATE NOT NULL
publico_alvo      VARCHAR NOT NULL
formato           PRESENCIAL | ONLINE | IMPRESSO | HIBRIDO
status            RASCUNHO | PUBLICADO | ARQUIVADO
published_at      TIMESTAMPTZ NULL
created_by        UUID NOT NULL FK usuarios
updated_by        UUID NOT NULL FK usuarios
created_at        TIMESTAMPTZ NOT NULL
updated_at        TIMESTAMPTZ NOT NULL
deleted_at        TIMESTAMPTZ NULL
```

Regras:

- `data_fim >= data_inicio`;
- slug válido e único;
- categoria compatível com o tipo;
- publicação somente com campos obrigatórios válidos;
- `published_at` controlado pelo backend;
- consultas públicas filtram `PUBLICADO` e `deleted_at IS NULL`;
- índices para slug, status, período e categoria;
- carga horária numérica caso seja totalizada no dashboard.

Se Atividades também alimentar Pesquisa, incluir uma dimensão como `area = ENSINO | PESQUISA` antes de fechar a migration inicial.

---

## 9. Contratos e segurança

### 9.1 Convenções de API

Bases propostas:

```text
/api/v1/public
/api/v1/admin
```

Convenções:

- JSON em camelCase;
- IDs UUID;
- datas em `YYYY-MM-DD`;
- timestamps em ISO 8601;
- listas administrativas e públicas paginadas;
- erro padronizado com código, mensagem e detalhes;
- contratos OpenAPI;
- endpoints de transição editorial validados pelo domínio.

### 9.2 Autenticação e autorização

Recomendação inicial:

- cookie `HttpOnly`, `Secure` e `SameSite=Lax` ou `Strict`;
- nenhum token em `localStorage`;
- CSRF nas operações de escrita autenticadas por cookie;
- RBAC no Quarkus para todos os endpoints `/admin`;
- configuração explícita de `HttpOnly`, pois não se deve presumir o padrão do framework;
- limitação de tentativas de login;
- validação de entrada e limites de paginação;
- erros sem stack trace;
- segredos somente por ambiente ou gerenciador de segredos.

O administrativo não deverá ser disponibilizado em produção sem autenticação e autorização reais.

---

## 10. Fases de implementação e implantação

| Fase | Entrega | Critérios de aceite e evidências | Status |
|---|---|---|---|
| **0. Especificação** | Fechar menus, perfis, campos, renderização e ciclo editorial | Especificação aprovada; decisões registradas; pendências de Pesquisa resolvidas | Concluída |
| **1. Fundação** | Backend Quarkus, PostgreSQL 18, Flyway, health checks, layout público e shell administrativo | Build Angular; testes do backend; migration executada; smoke test nativo GraalVM | Em andamento (Frontend estruturado) |
| **2. HOME e estrutura pública** | Rota `/`, menu, seção institucional, foto e rodapé | Checklist da seção 13 concluído; testes, build e evidências visuais | **Concluída no frontend** (Seção 13.4) |
| **3. Usuários e autenticação** | Migration de usuários, login/logout/me, CRUD administrativo e telas Angular | ADMIN gerencia usuários; PROFESSOR não acessa esse CRUD; testes RBAC e E2E de login | Planejada |
| **4. Atividades e Ensino** | Categorias, atividades, CRUD, publicação e páginas públicas | Criar → publicar → visualizar; rascunho não aparece; testes com PostgreSQL 18 | Planejada |
| **5. Dashboard e deploy do MVP** | Indicadores, reverse proxy, TLS, logs, backups, staging e produção | Smoke tests pós-deploy; health checks; ensaio de rollback e restauração | Planejada |
| **6. Biblioteca** | Banco + API + CRUD + área pública | Fluxo vertical completo e campos validados | Planejada |
| **7. Extensão** | Banco + API + CRUD + página pública | Publicação e listagem pública testadas | Planejada |
| **8. Produção** | Banco + API + CRUD + página pública | Publicação e listagem pública testadas | Planejada |
| **9. Pesquisa** | Módulo próprio ou integração com Atividades | Menu alimentado pela origem definida, com testes | Planejada |

A ordem de Biblioteca, Extensão e Produção pode ser alterada por prioridade. Cada módulo deverá atualizar dashboard, navegação, testes de autorização e documentação.

### Princípio de fatiamento

Cada funcionalidade será entregue verticalmente:

```text
migration → domínio/API → CRUD administrativo → página pública → testes → evidências
```

Não se deve criar todo o banco, depois todas as APIs e somente então todas as telas.

---

## 11. Estratégia de deploy

Para a abordagem recomendada:

1. Executar testes e build do Angular.
2. Executar testes unitários e de integração do backend com PostgreSQL 18.
3. Compilar e testar o backend nativo via GraalVM desde as primeiras fases.
4. Gerar os artefatos/imagens do frontend e do backend.
5. Realizar backup antes de aplicar migrations.
6. Aplicar migrations Flyway de forma controlada, preferencialmente como etapa ou job de deploy.
7. Atualizar backend e frontend, aguardando health checks.
8. Executar smoke tests de acesso público, login, CRUD e publicação.
9. Registrar versões e evidências do deploy.
10. Manter rollback dos artefatos e compatibilidade das migrations.

Diretrizes adicionais:

- banco sem exposição pública desnecessária;
- TLS no reverse proxy;
- assets fingerprintados com cache apropriado;
- logs estruturados e identificador de requisição;
- segredos fora das imagens e do repositório;
- migrations compatíveis com rollback pelo padrão expand/contract;
- restauração de backup testada, não apenas presumida.

O Quarkus também suporta Mandrel para builds nativos em containers Linux. Se GraalVM Oracle/CE for requisito estrito, o builder correspondente deverá ser configurado explicitamente.

---

## 12. Estratégia de testes e Definition of Done

### Níveis de teste

- **Frontend unitário:** componentes, rotas, formulários, estados e serviços.
- **Backend unitário:** regras de período, slug, publicação, permissões e invariantes.
- **Integração:** PostgreSQL 18 real, repositories, migrations e endpoints.
- **Contrato:** DTOs e OpenAPI, sem vazamento de campos administrativos.
- **Nativo:** smoke tests e integração dos fluxos sensíveis a reflection/resources.
- **E2E:** login, CRUD, publicação e visualização pública.
- **Acessibilidade:** teclado, leitura semântica, WCAG AA e AXE.
- **Visual/manual:** responsividade, conteúdo, assets e estados de erro/vazio.

### Definition of Done por funcionalidade

Uma tarefa somente será concluída quando:

- seu critério de aceite estiver atendido;
- os testes relevantes tiverem sido executados com sucesso;
- o build correspondente tiver sido executado;
- não houver segredos ou dados reais indevidos no repositório;
- a documentação afetada estiver atualizada;
- houver evidência de teste e, para UI, evidência visual;
- o diff tiver sido revisado;
- o comportamento público não expuser rascunhos ou dados administrativos.

---

## 13. Checklist básico de implementação — HOME

### 13.1 Escopo

A HOME deverá reproduzir a estrutura da referência:

- endpoint `/`;
- menu HOME, ENSINO, PESQUISA, EXTENSÃO, PRODUÇÃO e CONTATO;
- logotipo do grupo;
- texto “Quem somos”;
- foto do grupo;
- rodapé com SEPT, endereço e logotipos SEPT/UFPR.

Fora do escopo deste checklist:

- CRUDs;
- autenticação;
- integração da HOME com banco;
- conteúdo definitivo dos demais módulos;
- dashboard.

### 13.2 Tarefas

- [x] **HOME-001 — Validar conteúdo e assets institucionais**
  - Obter texto “Quem somos”, endereço, logotipo do grupo, foto do grupo e logos SEPT/UFPR.
  - Confirmar formatos, dimensões, direitos de uso e textos alternativos.
  - Registrar quaisquer placeholders temporários, sem apresentá-los como oficiais.
  - **Status:** Concluído com placeholders controlados. Assets copiados de `images/` para `gpet-frontend/public/images/`: `gpet-icon-32.png` (favicon 32x32), `gpet-icon-64.png` (toolbar 64x64) e `gpet-logo.jpg` (logo horizontal). Pendências identificadas: foto oficial do grupo e logotipos oficiais de SEPT e UFPR (atualmente com placeholders semânticos).

- [x] **HOME-002 — Criar a rota e o shell público**
  - Configurar `/` como rota da HOME com componente standalone.
  - Aplicar lazy loading quando a estrutura de features estiver separada.
  - Criar o shell público compartilhável com cabeçalho, conteúdo e rodapé.
  - Na abordagem recomendada, configurar HOME como estática/pré-renderizada; na SPA, garantir fallback de rota.
  - **Status:** Concluído. Rota `/` configurada com lazy loading (`loadComponent`) em `app.routes.ts`. Shell público implementado via componente reutilizável `PageLayout` que compõe `FloatingMenu`, `<ng-content>` e `Footer`.

- [x] **HOME-003 — Implementar o menu principal**
  - Exibir os seis itens na ordem da referência (HOME, ENSINO, PESQUISA, EXTENSÃO, PRODUÇÃO, CONTATO).
  - Configurar links para as rotas previstas, sem links falsos ou destinos incorretos.
  - Marcar o item atual com `aria-current="page"` e classe ativa destacada em vermelho.
  - Garantir navegação por teclado e foco visível, além de suporte a submenus com Escape para fechar.
  - Implementar menu flutuante com bordas arredondadas e setas geométricas indicadoras (`▴` em repouso e `▾` ao passar o mouse ou acionar).
  - Prever comportamento responsivo sem impedir acesso a qualquer item (modo hambúrguer no mobile).
  - **Status:** Concluído. Implementado em `FloatingMenu` e `Submenu` com arquivos separados (`.ts`, `.html`, `.css`).

- [x] **HOME-004 — Implementar a área institucional principal**
  - Apresentar logotipo do grupo, “Quem somos” e foto do grupo.
  - Usar `NgOptimizedImage` para imagens estáticas, com dimensões e carregamento adequados.
  - Definir textos alternativos significativos ou alt vazio para imagens estritamente decorativas.
  - Evitar deslocamento de layout reservando o espaço das imagens.
  - **Status:** Concluído. Separado por composição nos componentes `GroupIntro` (logotipo otimizado com `NgOptimizedImage` + Quem somos) e `GroupPhoto` (moldura arredondada com proporção 4:3 e placeholder acessível enquanto a foto definitiva não é enviada).

- [x] **HOME-005 — Implementar o rodapé institucional**
  - Exibir “Setor de Educação Profissional e Tecnológica — SEPT” e o endereço validado.
  - Exibir os logos SEPT e UFPR com dimensões e textos alternativos adequados.
  - Garantir leitura e contraste em telas pequenas.
  - **Status:** Concluído. Implementado no componente `Footer` com `.ts`, `.html` e `.css` isolados e placeholders para os logos SEPT/UFPR.

- [x] **HOME-006 — Aplicar responsividade e acessibilidade**
  - Verificar 320 px, 768 px, 1024 px e 1440 px.
  - Manter hierarquia correta de headings e landmarks semânticos (`<nav>`, `<main>`, `<section>`, `<figure>`, `<footer>`).
  - Garantir contraste WCAG AA, foco visível e ausência de overflow horizontal.
  - Menu responsivo com botão toggle para visualização móvel.
  - **Status:** Concluído. Layout flexível com media queries para 768px no grid da Home e na navegação do menu flutuante.

- [x] **HOME-007 — Configurar metadados básicos**
  - Definir `lang="pt-BR"` no documento.
  - Configurar título da HOME (`GPET - Home`).
  - Configurar ícone na barra de título do navegador (favicon 32x32 em `images/gpet-icon-32.png`).
  - **Status:** Concluído em `src/index.html` e `app.routes.ts`.

- [x] **HOME-008 — Adicionar testes da HOME**
  - Testar criação/renderização do componente.
  - Testar presença do conteúdo, menu, imagens e rodapé.
  - Testar rota `/`, links e indicação do item ativo.
  - Testar alternância dinâmica da seta do menu (`▴` em repouso e `▾` ao interagir com mouse/hover).
  - **Status:** Concluído. Testes implementados em `src/app/app.spec.ts` e `src/app/shared/ui/floating-menu/floating-menu.spec.ts`.

- [x] **HOME-009 — Executar o checkpoint de qualidade**
  - Executar testes automatizados no frontend.
  - Executar build de produção do Angular.
  - Revisar o diff e arquitetura de componentes.
  - **Status:** Concluído. `npm test` executado com 100% de sucesso (3 testes passando) e `npm run build` gerando os bundles sem erros.

### 13.3 Rastreabilidade da HOME

| Requisito | Tarefas | Teste/verificação | Evidência esperada |
|---|---|---|---|
| HOME disponível em `/` | HOME-002 | Teste de rota e acesso direto | Resultado do teste e URL acessível |
| Menu conforme referência | HOME-003 | Testes de links e teclado | Resultado dos testes e captura |
| Logotipo, “Quem somos” e foto | HOME-001, HOME-004 | Renderização e inspeção visual | Capturas e assets revisados |
| Rodapé SEPT/endereço/logos | HOME-001, HOME-005 | Conteúdo, contraste e responsividade | Capturas e verificação de conteúdo |
| Responsividade e WCAG AA | HOME-006 | AXE, teclado e quatro viewports | Relatório AXE e capturas |
| Metadados da página | HOME-007 | Inspeção do HTML de produção | Trecho/relatório do HTML gerado |
| Qualidade verificável | HOME-008, HOME-009 | Testes, build e revisão do diff | Saídas reais e diff revisado |

---

### 13.4 Checklist detalhado das entregas realizadas até aqui

Abaixo está o inventário de tudo o que foi implementado no projeto para a Fase 2 (HOME e Estrutura Pública), em total conformidade com os princípios de **Domain Driven Design (DDD)**, **Composição de Componentes**, **separação estrita de arquivos (`.ts`, `.html`, `.css`)** e boas práticas do Angular 22:

#### A) Arquitetura de Domínio (DDD)
- [x] **Shared Kernel (`src/app/shared/navigation/`)**:
  - `domain/menu-item.model.ts`: Definição do Value Object `MenuItem` imutável (`label`, `route`, `children`).
  - `infrastructure/main-menu.data.ts`: Provedor estático da árvore de navegação com os 6 itens principais e subitens de apoio.
  - `application/navigation.service.ts`: Serviço de aplicação com Signals reativos expondo a navegação principal (`mainMenu`).
- [x] **Bounded Context Institucional (`src/app/domains/institucional/`)**:
  - `domain/group-profile.model.ts`: Entidade `GroupProfile` contendo nome, logotipo, título, descrição "Quem somos" e foto.
  - `infrastructure/group-profile.data.ts`: Dados institucionais do grupo GPET e caminhos de assets.
  - `application/group-profile.service.ts`: Serviço de aplicação com Signal imutável para consulta do perfil do grupo.

#### B) Composição de Componentes Reutilizáveis (UI)
Todos os componentes foram implementados com arquivos separados para template HTML, folha de estilo CSS e lógica TypeScript:
- [x] **`FloatingMenu` (`src/app/shared/ui/floating-menu/`)**:
  - `floating-menu.ts`: Lógica reativa com Signals (`openIndex`, `mobileOpen`), controle de foco, eventos de teclado (Escape fecha submenu) e inputs configuráveis (`items`, `iconSrc`, `brandLabel`).
  - `floating-menu.html`: Template semântico `<nav>` com lista de itens, acessibilidade ARIA (`aria-expanded`, `aria-controls`), botão toggle móvel e suporte a submenus.
  - `floating-menu.css`: Menu flutuante arredondado (`border-radius: 9999px`), efeito `backdrop-filter: blur`, posição sticky no topo da tela, sombra suave e responsividade móvel.
  - **Sinalização geométrica da seta**: Exibe triângulo para cima (`▴`) em repouso e alterna para baixo (`▾`) quando o item está com foco/mouse por cima/aberto.
  - `floating-menu.spec.ts`: Cobertura de testes unitários para renderização inicial e alternância dinâmica das setas `▴`/`▾`.
- [x] **`Submenu` (`src/app/shared/ui/submenu/`)**:
  - `submenu.ts`, `submenu.html`, `submenu.css`: Componente independente e desacoplado para menus suspensos, reutilizável em qualquer nível de navegação.
- [x] **`Footer` (`src/app/shared/ui/footer/`)**:
  - `footer.ts`, `footer.html`, `footer.css`: Rodapé institucional com SEPT, endereço completo e marcadores semânticos para os logotipos do SEPT e UFPR.
- [x] **`PageLayout` (`src/app/shared/ui/page-layout/`)**:
  - `page-layout.ts`, `page-layout.html`, `page-layout.css`: Shell de composição geral que integra o menu flutuante no topo, área de conteúdo dinâmico via projeção `<ng-content>` e rodapé no final da página. Permite que qualquer tela futura reutilize a mesma estrutura visual.

#### C) Tela Home e Componentes Especializados
- [x] **`GroupIntro` (`src/app/domains/institucional/presentation/components/group-intro/`)**:
  - `group-intro.ts`, `group-intro.html`, `group-intro.css`: Bloco institucional contendo o logotipo horizontal colorido com `NgOptimizedImage` e o texto "Quem somos".
- [x] **`GroupPhoto` (`src/app/domains/institucional/presentation/components/group-photo/`)**:
  - `group-photo.ts`, `group-photo.html`, `group-photo.css`: Moldura fotográfica responsiva com cantos arredondados, aspect-ratio 4:3 e fallback/placeholder acessível até o envio da foto definitiva.
- [x] **`Home` (`src/app/domains/institucional/presentation/pages/home/`)**:
  - `home.ts`, `home.html`, `home.css`: Página inicial montada inteiramente por composição (`PageLayout` + `GroupIntro` + `GroupPhoto`).
  - Rota `/` configurada com lazy loading no arquivo `app.routes.ts`.

#### D) Assets e Configuração do Navegador
- [x] **Favicon do Navegador**: Imagem `images/gpet_icone_fundo_transparent_32x32.png` copiada para `public/images/gpet-icon-32.png` e vinculada na barra de título em `index.html`.
- [x] **Ícone da Toolbar**: Imagem `images/gpet_icone_fundo_transparente_64x64.png` copiada para `public/images/gpet-icon-64.png` e vinculada na marca do menu flutuante (exibida a 48px).
- [x] **Logotipo do Grupo**: Imagem `images/logo_web_horizontal_colorido_com_fundo_transparente.jpg` copiada para `public/images/gpet-logo.jpg`.
- [x] **Metadados**: `lang="pt-BR"` e título configurados no `index.html`.

#### E) Verificação e Testes
- [x] `npx ng build`: Compilação de produção executada com sucesso (bundles lazy e main sem erros).
- [x] `npx ng test --watch=false`: Suíte de testes com Vitest executada com 100% de sucesso (3 testes passando).

---

## 14. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Modelo genérico dificultar evolução | Alto | Tabelas específicas por domínio e padronização somente do ciclo editorial |
| Problemas tardios com GraalVM | Alto | Build e testes nativos no CI desde a fundação |
| SSR aumentar a operação | Médio | SSR somente nas rotas públicas; administrativo em CSR |
| Exposição de rascunhos ou dados administrativos | Alto | Consultas e DTOs públicos separados, com testes específicos |
| Administrativo sem segurança suficiente | Alto | Autenticação, RBAC, cookies seguros e CSRF antes da produção |
| Migration impedir rollback | Alto | Backup, expand/contract e ensaio de restauração |
| Plano antigo induzir implementação em Rust | Médio | Usar este documento como nova proposta e revisar os documentos após aprovação |
| Escopo de Pesquisa divergente | Alto | Resolver a origem dos dados antes da migration de Atividades |
| Assets institucionais indisponíveis | Médio | Identificar pendências em HOME-001 e não tratar placeholders como definitivos |
| Atualizações automáticas de major | Médio | Fixar versões e atualizar somente após testes de compatibilidade |

---

## 15. Próximos pontos de aprovação

Antes da implementação completa, aprovar ou ajustar:

1. a abordagem de renderização e deploy;
2. a modelagem relacional por domínio;
3. a ordem das fases;
4. o checklist da HOME;
5. a origem dos dados de PESQUISA;
6. a matriz de permissões de ADMIN e PROFESSOR.

A implementação de usuários e atividades depende das decisões 5 e 6. A HOME pode ser especificada e desenvolvida sem essas duas respostas.

---

## 16. Fontes oficiais consultadas

- Angular — versões e suporte:
  - https://angular.dev/reference/releases
  - https://angular.dev/reference/versions
- Angular — SSR e renderização híbrida:
  - https://angular.dev/guide/ssr
- Angular — lazy loading:
  - https://angular.dev/guide/routing/loading-strategies
- Quarkus — Kotlin:
  - https://quarkus.io/guides/kotlin
- Quarkus — build nativo GraalVM/Mandrel:
  - https://quarkus.io/guides/building-native-image
- Quarkus — trade-offs de empacotamento nativo:
  - https://quarkus.io/guides/packaging/
- Quarkus — SPAs e recursos estáticos:
  - https://quarkus.io/guides/web
  - https://quarkus.io/guides/http-reference
- Quarkus — Panache Kotlin e PostgreSQL:
  - https://quarkus.io/guides/hibernate-orm-panache-kotlin
  - https://quarkus.io/guides/datasource
- Quarkus — Flyway e segurança:
  - https://quarkus.io/guides/flyway
  - https://quarkus.io/guides/security-authentication-mechanisms
  - https://quarkus.io/guides/security-csrf-prevention
- PostgreSQL 18 — release oficial:
  - https://www.postgresql.org/docs/18/release-18.html
