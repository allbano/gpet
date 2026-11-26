# Repositório da Aplicação do Grupo de Pesquisa GPET - UFPR

## Tema do TCC de Albano Roberto Drescher Von Maywitz

## Serviços de atividades

Cada pasta de backend contém um projeto Cargo independente, com domínio, aplicação, persistência, rotas, testes e banco próprios. Execute `cargo test --locked` dentro da pasta do serviço desejado.

Na raiz do repositório, suba o ambiente de desenvolvimento e carregue os exemplos que desejar.

```sh
docker compose -f infra/docker-compose.dev.yaml up --build -d
docker compose -f infra/docker-compose.dev.yaml exec backend_atividades_formativas /usr/local/bin/atividades mock
docker compose -f infra/docker-compose.dev.yaml exec backend_atividades_informativas /usr/local/bin/atividades mock
```

Os serviços **formativas** e **informativas** atendem em `localhost:8081` e `localhost:8082`, respectivamente. Cada um oferece `/swagger-ui/`, `/openapi.json`, `/health` e `/ready`. Os prefixos REST são `/api/v1/formativas` e `/api/v1/informativas`. Para abrir o minicurso de três dias após carregar o mock, consulte `GET /api/v1/formativas/atividades/019aa000-0001-7000-8000-000000000001`.

Cada backend tem três migrações SQLx ordenadas em `database/migrations/` e uma carga opcional de 120 atividades em `database/0003_mock.sql`. As APIs aplicam as migrações antes de abrir a porta. O comando `mock` executa a carga em uma transação e pode ser repetido. Os bancos de desenvolvimento usam as portas locais 5432 e 5433. Para trocar uma porta ocupada, defina `PG_FORMATIVAS_PORT` ou `PG_INFORMATIVAS_PORT`. As migrações criam bases novas. A importação de bases legadas com um único par de datas depende da programação real de cada atividade.

Em produção, defina `PG_FORMATIVAS_PASSWORD_FILE` e `PG_INFORMATIVAS_PASSWORD_FILE` com os caminhos de arquivos distintos legíveis pelos processos dos contêineres. Execute `docker compose -f infra/docker-compose.prod.yaml up --build -d`. As APIs e os bancos ficam em redes internas. Conecte o gateway à rede `gpet-prod_gateway` e encaminhe o tráfego HTTP aos serviços na porta 8080. O gateway deve autenticar e autorizar todas as rotas sob `/interno/` de cada prefixo. A especificação OpenAPI de cada binário release pode ser exportada com o argumento `openapi`.

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
