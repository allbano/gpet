# Plano de implementação — atividades informativas

Implementar o serviço Rust na pasta existente `backend_atividades_informativas`, com seu próprio PostgreSQL 18. A cartilha impressa deve ter uma página pública antes da definição de uma data. Ao acrescentar dois períodos de lançamento, a mesma página deve mostrar ambos e a lista deve continuar com um cartão. Priorizar simplicidade e legibilidade em cada etapa.

## I — Banco de dados e revisão da modelagem

1. Partir das seções 6, 7, 11 e 12 da [modelagem do GPET](gpet_modelagem_atividades_postgresql18.md). A proposta já inclui atividades sem horários na lista pública por meio de um `LEFT JOIN`. A view também agrega os períodos para calcular limites, quantidade e união temporal. A consulta dos cartões pode ler diretamente a atividade e sua classificação.
2. Usar a pasta `database/` do projeto para as migrações SQLx versionadas. Criar no schema `gpet` as tabelas `modalidades`, `atividades_informativas` e `periodos_informativos`. Usar PKs UUIDv7, FK com exclusão restrita na classificação e exclusão em cascata nos períodos.
3. Manter `titulo_acao` e `objetivo_acao` e mapeá-los para `titulo` e `descricao` no contrato público. Permitir carga horária nula para materiais de divulgação. Acrescentar `conteudo` em texto simples, preservar o público-alvo textual e exigir conteúdo preenchido para publicar.
4. Manter os controles independentes `publicacao_publica` e `agenda_pesquisa`. Cada sessão tem UUID, intervalo `tstzrange` finito de duração positiva com limites `[)` e fuso validado. Preservar sessões adjacentes e lacunas. Para bases com dados anteriores, converter horários somente a partir da programação conhecida e conferir os dados antes da troca.

## II — Domínio e persistência em Rust

1. Organizar a crate existente em módulos de domínio, aplicação, infraestrutura e HTTP. Representar `AtividadeInformativa` por uma struct com campos privados e métodos para editar conteúdo, publicar e alterar a programação. Modelar período como entidade do agregado. Usar composição e reservar traits às fronteiras que exigem substituição, como persistência.
2. Implementar os casos de uso com SQLx. Ao alterar a programação, bloquear a linha da atividade, verificar a associação do período e atualizar o período e o `updated_at` da atividade na mesma transação. Fazer rollback integral em caso de falha.
3. Manter consultas de leitura específicas para cartão, detalhe e ocorrência. Centralizar nos métodos de domínio as regras de escrita e usar DTOs explícitos no HTTP.

## III — Consultas para a SPA Angular

| Tela | Consulta e contrato |
|---|---|
| Listagem | Selecionar UUID, título, descrição curta, modalidade e meio das atividades públicas. Ordenar por `(created_at DESC, uuidv7 DESC)`, usar cursor sobre o mesmo par e buscar um item extra. Retornar `itens` e `proximo_cursor`, com 20 itens por padrão e máximo de 100. Criar índice B-tree parcial com essa ordenação e predicado `WHERE publicacao_publica`. |
| Página individual | Permitir acesso direto pelo UUID. Buscar em uma consulta a atividade publicada, classificação, conteúdo completo, público-alvo, carga horária e todos os períodos daquele UUID. Entregar `id`, `inicio`, `termino` e `fuso` por sessão, com instantes RFC 3339. Usar índice em `(uuidv7_atividade, lower(periodo), uuidv7)` e a mesma ordenação dentro do array. Sem programação, retornar `periodos: []`. |
| Agenda interna | Exigir início e término da janela. Consultar atividades com `agenda_pesquisa` e períodos que satisfaçam `periodo && tstzrange(inicio, termino, '[)')`. Usar índice GiST sobre o período e paginar por início da sessão e UUID do período. O gateway pode compor as ocorrências das duas APIs por HTTP. |

## IV — API REST e OpenAPI

Usar Axum com o prefixo `/api/v1/informativas`. As rotas internas dependem da autenticação e autorização pelo gateway. Em produção, a rede deve impedir acesso direto às APIs pelos clientes.

| Caminho relativo | Métodos | Finalidade |
|---|---|---|
| `/atividades` | GET | Listar cartões públicos. |
| `/atividades/{id}` | GET | Exibir a página individual. Retornar 404 para atividade privada ou ausente. |
| `/interno/agenda` | GET | Consultar ocorrências por janela. |
| `/interno/atividades` | GET, POST | Listar cadastros, inclusive rascunhos, e criar atividade. |
| `/interno/atividades/{id}` | GET, PATCH, DELETE | Ler, editar, publicar ou excluir uma atividade. |
| `/interno/atividades/{id}/periodos` | GET, POST | Consultar a programação ou acrescentar sessão. |
| `/interno/atividades/{id}/periodos/{periodoId}` | GET, PATCH, DELETE | Consultar, editar ou remover uma sessão da atividade. |
| `/interno/modalidades` | GET, POST | Listar ou criar classificações. |
| `/interno/modalidades/{id}` | GET, PATCH, DELETE | Consultar, editar ou excluir uma classificação. |

Registrar todas as operações com `utoipa-axum`, incluindo `GET /health` e `GET /ready` na raiz da API. Documentar parâmetros, cursor, exemplos, schemas de entrada e saída, acesso e erros. Usar 201 com `Location` na criação, 204 na exclusão, 400 para parâmetros inválidos, 409 para classificação em uso e 422 para regra de domínio violada. Exportar a especificação deste serviço na CI e verificar a cobertura por método e caminho.

## V — Docker Compose e validação de desempenho

1. Atualizar o arquivo compartilhado `infra/docker-compose.dev.yaml`. Corrigir os conflitos de nome de contêiner, porta e volume entre os bancos. Usar volume exclusivo por PostgreSQL, healthcheck com usuário e banco configurados e conexão da API pelo nome do serviço. Reservar ao domínio informativas as portas de loopback 8082 para HTTP e 5433 para PostgreSQL.
2. Criar Dockerfile multiestágio na pasta do backend. Após o banco ficar saudável, executar migrações SQLx antes de aceitar tráfego, inclusive no reinício com volume existente. Remover o carregamento duplicado via `docker-entrypoint-initdb.d`. Habilitar Swagger UI em `/swagger-ui/` e a especificação em `/openapi.json` no desenvolvimento.
3. Criar o arquivo compartilhado `infra/docker-compose.prod.yaml` para os dois serviços, com binários release, bancos e volumes independentes, secrets e acesso privado pelo gateway. Compilar a API sem a feature de exposição HTTP do Swagger e verificar 404 para a UI e o JSON. A especificação continua disponível como artefato da CI.
4. Medir com uma base de referência de 100 mil atividades deste domínio, incluindo privadas, públicas, sem programação e com várias sessões. Comparar a primeira página e uma página profunda por cursor. Medir também detalhe e agenda semanal com `EXPLAIN (ANALYZE, BUFFERS)`. Registrar latência p95, concorrência, ambiente e tamanho das respostas. Verificar que a listagem dispensa a leitura dos períodos e que o detalhe restringe a busca à atividade selecionada.

## Checklist de implementação por etapa

- [ ] `I_01` Aplicar as migrações em PostgreSQL 18 e validar chaves, índices, fusos e intervalos.
- [ ] `I_02` Verificar separadamente publicação, inclusão na agenda e ausência de programação.
- [ ] `II_01` Implementar o agregado, os casos de uso e as transações do repositório.
- [ ] `II_02` Testar edições concorrentes e rollback de uma alteração inválida de período.
- [ ] `III_01` A cartilha impressa deve ter uma página pública antes da definição de uma data. Ao acrescentar dois períodos de lançamento, a mesma página deve mostrar ambos e a lista deve continuar com um cartão.
- [ ] `III_02` Abrir a página pelo UUID, verificar o conteúdo e conferir períodos consecutivos e atividades sem horário.
- [ ] `III_03` Validar paginação sem duplicatas, consultas entre dias e exclusão do limite final da janela.
- [ ] `IV_01` Conferir endpoints públicos e internos e testar a autorização pelo gateway.
- [ ] `IV_02` Validar a especificação OpenAPI e a cobertura de todos os métodos e caminhos.
- [ ] `V_01` Subir os dois ambientes e verificar isolamento dos bancos, aplicação das migrações e persistência após reinício.
- [ ] `V_02` Confirmar Swagger UI e JSON em desenvolvimento e resposta 404 em produção.
- [ ] `V_03` Registrar planos de execução e medições de lista, detalhe e agenda.
