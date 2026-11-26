# Frontend GPET (Angular 22)

Aplicação web em **Angular 22**, **Tailwind CSS v4** e **Signal Forms** para os serviços independentes de **Atividades Formativas** e **Atividades Informativas** do GPET - UFPR, integrada exclusivamente ao **`api_gateway`**.

## Arquitetura (Domain-Driven Design)

Os módulos de negócio são completamente isolados em dois *Bounded Contexts* sem importações cruzadas:

- `src/app/formativas/`:
  - `domain/`: entidades, regras de validação (`AtividadeFormativa`, `PeriodoFormativo`, `TipoAtividade`) e portas (`ATIVIDADE_FORMATIVA_REPOSITORY`, `TIPO_ATIVIDADE_REPOSITORY`).
  - `application/`: facades baseadas em Angular Signals (`FormativasPublicCatalogFacade`, `FormativasPrivateManagerFacade`).
  - `infrastructure/`: adaptadores HTTP exclusivos para `/public/formativas/*` e `/private/formativas/*`.
  - `presentation/`: telas separadas para `public/` (READ por listagem paginada por cursor e detalhe por UUID) e `private/` (CRUD completo de atividades, períodos, tipos de atividade e agenda).
- `src/app/informativas/`:
  - `domain/`: entidades, regras de validação (`AtividadeInformativa`, `PeriodoInformativo`, `Modalidade`) e portas (`ATIVIDADE_INFORMATIVA_REPOSITORY`, `MODALIDADE_REPOSITORY`).
  - `application/`: facades baseadas em Angular Signals (`InformativasPublicCatalogFacade`, `InformativasPrivateManagerFacade`).
  - `infrastructure/`: adaptadores HTTP exclusivos para `/public/informativas/*` e `/private/informativas/*`.
  - `presentation/`: telas separadas para `public/` (READ) e `private/` (CRUD completo de atividades, períodos, modalidades e agenda).
- `src/app/core/`: configuração do `api_gateway` (`API_GATEWAY_BASE_URL`), mapeamento de erros HTTP, checagem de prontidão (`/ready`, `/public/*/ready`), notificações e conversão de fuso horário IANA (`America/Sao_Paulo`, `UTC`, etc.).
- `src/app/shared/`: componentes e pipes reutilizáveis (`ConfirmDialog` com `<dialog>` nativo, `CursorPagination`, `MeioBadge`, `StatusBanner`, `EmptyState`, `LoadingSkeleton`, `NotificationToast`, `CargaHorariaPipe`, `PeriodoFusoPipe`), todos com `.ts`, `.html`, `.css` e `.spec.ts` separados.

## Execução com o API Gateway

1. Suba os bancos, os backends e o `api_gateway` na raiz do repositório:

```sh
docker compose -f infra/docker-compose-gateway.dev.yaml up --build -d
docker compose -f infra/docker-compose-gateway.dev.yaml exec backend_atividades_formativas /usr/local/bin/atividades mock
docker compose -f infra/docker-compose-gateway.dev.yaml exec backend_atividades_informativas /usr/local/bin/atividades mock
```

2. Inicie o servidor Angular (o arquivo `proxy.conf.json` encaminha `/public`, `/private`, `/health` e `/ready` para `http://127.0.0.1:55569`):

```sh
npm start
```

Acesse `http://localhost:4200/`.

## Testes (TDD) e Build

```sh
# Executar toda a suíte de testes unitários e de rotas (Vitest)
npm test -- --watch=false

# Gerar build de produção
npm run build
```
