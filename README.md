# Repositório da Aplicação do Grupo de Pesquisa GPET - UFPR

## Tema do TCC de Albano Roberto Drescher Von Maywitz

## Serviços de atividades

Cada pasta de backend contém um projeto Cargo independente, com domínio, aplicação, persistência, rotas, testes e banco próprios. Execute `cargo test --locked` dentro da pasta do serviço desejado.

Na raiz do repositório, você pode subir os serviços diretamente (`docker-compose.dev.yaml`) ou centralizados pelo **API Gateway** (`docker-compose-gateway.dev.yaml`).

```sh
# Com API Gateway centralizado na porta 55569 (Swagger UI unificado em http://localhost:55569/swagger-ui/)
docker compose -f infra/docker-compose-gateway.dev.yaml up --build -d
docker compose -f infra/docker-compose-gateway.dev.yaml exec backend_atividades_formativas /usr/local/bin/atividades mock
docker compose -f infra/docker-compose-gateway.dev.yaml exec backend_atividades_informativas /usr/local/bin/atividades mock

# Ou diretamente sem gateway (portas 8081 e 8082)
docker compose -f infra/docker-compose.dev.yaml up --build -d
docker compose -f infra/docker-compose.dev.yaml exec backend_atividades_formativas /usr/local/bin/atividades mock
docker compose -f infra/docker-compose.dev.yaml exec backend_atividades_informativas /usr/local/bin/atividades mock
```

Os serviços **formativas** e **informativas** atendem internamente na porta `8080` (ou em `localhost:8081` e `localhost:8082` quando executados via `docker-compose.dev.yaml`). Quando executados via **API Gateway** em Pingora (`api_gateway`, porta padrão `55569`, configurável via `BIND_ADDR`, `FORMATIVAS_UPSTREAM` e `INFORMATIVAS_UPSTREAM`), todas as rotas são expostas e separadas por visibilidade e serviço:

- **Gateway**: `/health` e `/ready`
- **Públicas (`/public/{service}`)**: `/public/formativas/atividades`, `/public/formativas/atividades/{id}`, `/public/formativas/health`, `/public/formativas/ready` (e equivalentes em `/public/informativas/...`)
- **Privadas (`/private/{service}`)**: `/private/formativas/agenda`, `/private/formativas/atividades`, `/private/formativas/atividades/{id}`, `/private/formativas/atividades/{id}/periodos`, `/private/formativas/atividades/{id}/periodos/{periodoId}`, `/private/formativas/tipos-atividade` (e `/private/informativas/modalidades` no módulo informativo)
- **Swagger UI (apenas na imagem `desenvolvimento` do gateway)**: `/swagger-ui/` com seletor no topo separando **Formativas — Public**, **Formativas — Private**, **Informativas — Public** e **Informativas — Private** (`/public/{service}/openapi.json` e `/private/{service}/openapi.json`).

Para abrir o minicurso de três dias após carregar o mock via gateway, consulte `GET http://localhost:55569/public/formativas/atividades/019aa000-0001-7000-8000-000000000001`.

Cada backend tem três migrações SQLx ordenadas em `database/migrations/` e uma carga opcional de 120 atividades em `database/0003_mock.sql`. As APIs aplicam as migrações antes de abrir a porta. O comando `mock` executa a carga em uma transação e pode ser repetido. Os bancos de desenvolvimento usam as portas locais 5432 e 5433. Para trocar uma porta ocupada, defina `PG_FORMATIVAS_PORT` ou `PG_INFORMATIVAS_PORT`. As migrações criam bases novas. A importação de bases legadas com um único par de datas depende da programação real de cada atividade.

Em produção, defina `PG_FORMATIVAS_PASSWORD_FILE` e `PG_INFORMATIVAS_PASSWORD_FILE` com os caminhos de arquivos distintos legíveis pelos processos dos contêineres. Execute `docker compose -f infra/docker-compose-gateway.prod.yaml up --build -d` (ou `infra/docker-compose.prod.yaml` para subir apenas bancos e backends na rede interna `gpet-prod_gateway`). Em ambos os casos, as APIs e os bancos ficam em redes internas; no arquivo com gateway, o serviço `api_gateway` (imagem `producao`, sem Swagger) encaminha o tráfego HTTP aos módulos na porta `8080` e expõe a entrada unificada na porta `55569` (configurável por `HTTP_GATEWAY_PORT`). A autenticação e autorização de `/private/` serão adicionadas ao gateway posteriormente. A especificação OpenAPI de cada binário release pode ser exportada com o argumento `openapi`.

A CI exercita as duas APIs com PostgreSQL 18, confere os métodos e caminhos e publica as especificações JSON. O contrato HTTP pode ser reproduzido com `python3 backend_atividades_formativas/tests/contrato.py http://localhost:8081 openapi-formativas.json --swagger` em um ambiente descartável carregado com o mock.

## Desempenho de formativas

Em uma base descartável vazia, execute o binário com `migrar` e carregue `backend_atividades_formativas/database/benchmark/referencia.sql` com `psql -v ON_ERROR_STOP=1`. Inicie a API release nessa base. Para repetir as medições, aponte as variáveis de conexão `PG*` para o mesmo banco e execute `python3 backend_atividades_formativas/tests/desempenho.py http://localhost:8081`. O arquivo `consultas.sql` na mesma pasta reproduz os quatro planos.

Medição local em PostgreSQL 18.7 em Docker, API release em Linux x86-64, Ryzen 5 5600X, 62 GiB de RAM. A base continha 100.000 atividades, 66.667 públicas e 4.000 sessões distribuídas entre 2.000 atividades. Cada consulta teve 20 requisições de aquecimento e 400 medidas com oito clientes concorrentes via loopback. As listagens usam páginas de 20 itens. O tamanho é a mediana do corpo JSON.

| Consulta | Latência HTTP p95 | Corpo |
|---|---:|---:|
| Primeira página | 2,70 ms | 4.314 B |
| Após o cartão 50.000 | 2,72 ms | 4.313 B |
| Detalhe com duas sessões | 2,62 ms | 614 B |
| Agenda de uma semana | 3,38 ms | 6.510 B |

As duas páginas usaram o índice parcial dos cartões e leram apenas atividades e classificações. O detalhe localizou a atividade pela chave primária e buscou suas duas sessões pelo índice da chave estrangeira. A agenda usou o GiST para filtrar a janela. [Planos de execução](docs/desempenho/planos-formativas.txt)
