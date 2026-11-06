# Plano de implementação — GPET com monólito modular

**Data:** 2026-11-06
**Status:** Plano para leitura e revisão; implementação não iniciada por este documento.
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
