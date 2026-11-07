# GPET frontend

Angular 22, TypeScript estrito, signals, Signal Forms e rotas lazy. Node 26.13.0 e npm 12.2.1 no build. Produção serve a SPA com NGINX e proxy `/api` na mesma origem.

Antes de iniciar, crie `../infra/.env` a partir de `../infra/.env.example`, caso ainda não exista. Esse arquivo reúne as portas, o host do Angular, os parâmetros do proxy e do E2E; `npm start` e Playwright o carregam automaticamente.

Nesta pasta:

```bash
npm ci
npm start
npm run test:unit
npm run build
```

O servidor dev abre em `http://localhost:4200` e encaminha `/api/**` ao backend em `http://127.0.0.1:8080`, conforme `proxy.conf.cjs`. O build fica em `dist/gpet-frontend/browser`.

Para usar backend e banco em Docker com este servidor de desenvolvimento, execute na raiz do repositório:

```bash
docker compose -f compose.dev.yaml stop frontend
docker compose -f compose.dev.yaml up -d --wait backend
```

Depois execute `npm start` nesta pasta e abra `http://localhost:4200`. Não é necessário reconstruir a imagem do frontend para editar os componentes. O `npm start` e o proxy leem `../infra/.env`. Reinicie o processo após alterar essa configuração.

Testes unitários usam Vitest/TestBed, HTTP mock e fixtures fictícios em `src/testing`. Incluem autenticação, guards, formulários, catálogos, paginação, erros de rede, conflitos e navegação por teclado.

E2E requer uma instalação GPET de teste, com banco novo e bootstrap concluído:

```bash
npx playwright install chromium
npm run test:e2e
```

A URL padrão é `http://127.0.0.1:8088`; ajuste `GPET_E2E_URL` em `infra/.env` para alterar. O arquivo de senha aponta ao secret inicial da instalação descartável. O E2E troca essa senha e cria dados fictícios; use banco novo a cada rodada. Playwright testa o fluxo completo e AXE verifica as páginas e formulários exercitados. O relatório fica em `playwright-report/`.

A Home foi preservada. Pesquisa, Extensão, Produção, Biblioteca e Materiais possuem páginas honestas de conteúdo ainda não publicado. Endereços desconhecidos exibem página de não encontrado. Não há CRUD de menus.

O menu público não possui links de administração ou login. O acesso administrativo começa diretamente em `/gpet-admin/login` (no servidor Angular: `http://localhost:4200/gpet-admin/login`). O caminho antigo `/login` não abre o formulário. Logout, troca de senha e guards encaminham ao novo endereço.

[Arquitetura](../docs/arquitetura.md), [plano e checklist](../docs/plan/plano_de_implementacao_gpet.md) e [operação](../docs/operacao.md).
