# Arquitetura do frontend (DDD + composição)

```
src/app/
├── shared/                        # Shared Kernel (reutilizável por todos os contextos)
│   ├── navigation/
│   │   ├── domain/                # MenuItem (value object)
│   │   ├── application/           # NavigationService (caso de uso)
│   │   └── infrastructure/        # MAIN_MENU (fonte de dados estática)
│   └── ui/
│       ├── floating-menu/         # Menu flutuante arredondado (+ ícone da toolbar)
│       ├── submenu/               # Dropdown de subitens
│       ├── footer/                # Rodapé de todas as páginas
│       └── page-layout/           # menu + <ng-content> + footer
└── domains/
    └── institucional/             # Bounded context "Institucional"
        ├── domain/                # GroupProfile (entidade)
        ├── application/           # GroupProfileService
        ├── infrastructure/        # GROUP_PROFILE (dados estáticos)
        └── presentation/
            ├── components/        # group-intro, group-photo
            └── pages/home/        # Tela Home (rota "/")
```

## Decisões
- Todos os componentes usam arquivos separados `.ts`, `.html` e `.css`.
- `PageLayout` compõe menu e rodapé; novas telas só precisam envolver o conteúdo em `<app-page-layout>`.
- Ícones: `gpet-icon-32.png` (32×32) na barra de título do navegador; `gpet-icon-64.png` (64×64, exibido a 48px) na toolbar.
- Logos SEPT/UFPR e foto do grupo ainda não existem em `/images`: há placeholders acessíveis até serem fornecidos.
- Nenhum caso exigiu abrir mão da composição.

