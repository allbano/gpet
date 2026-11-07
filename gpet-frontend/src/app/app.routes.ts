import { Routes } from '@angular/router';
import { authGuard, senhaGuard } from './domains/identidade/application/auth.guard';

const institucional = () =>
  import('./domains/institucional/presentation/pages/institucional/institucional').then(
    (m) => m.Institucional,
  );
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'GPET - Home',
    loadComponent: () =>
      import('./domains/institucional/presentation/pages/home/home').then((m) => m.Home),
  },
  {
    path: 'gpet-admin/login',
    title: 'GPET - Acesso',
    loadComponent: () =>
      import('./domains/identidade/presentation/login/login').then((m) => m.Login),
  },
  {
    path: 'trocar-senha',
    title: 'GPET - Trocar senha',
    canActivate: [senhaGuard],
    loadComponent: () =>
      import('./domains/identidade/presentation/senha/senha').then((m) => m.Senha),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () => import('./shared/ui/admin-layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'atividades' },
      {
        path: 'atividades',
        title: 'GPET - Gerenciar atividades',
        loadComponent: () =>
          import('./domains/atividades/presentation/admin-atividades/admin-atividades').then(
            (m) => m.AdminAtividades,
          ),
      },
      {
        path: 'categorias',
        title: 'GPET - Categorias',
        data: { recurso: 'categorias' },
        loadComponent: () =>
          import('./domains/atividades/presentation/catalogos/catalogos').then((m) => m.Catalogos),
      },
      {
        path: 'formatos',
        title: 'GPET - Formatos',
        data: { recurso: 'formatos' },
        loadComponent: () =>
          import('./domains/atividades/presentation/catalogos/catalogos').then((m) => m.Catalogos),
      },
      {
        path: 'usuarios',
        title: 'GPET - Usuários',
        loadComponent: () =>
          import('./domains/identidade/presentation/usuarios/usuarios').then((m) => m.Usuarios),
      },
    ],
  },
  {
    path: 'ensino',
    title: 'GPET - Ensino',
    loadComponent: () =>
      import('./domains/atividades/presentation/ensino/ensino').then((m) => m.Ensino),
  },
  {
    path: 'ensino/cursos',
    title: 'GPET - Cursos',
    loadComponent: () =>
      import('./domains/atividades/presentation/ensino/ensino').then((m) => m.Ensino),
  },
  {
    path: 'ensino/atividades/:id',
    title: 'GPET - Atividade',
    loadComponent: () =>
      import('./domains/atividades/presentation/detalhe/detalhe').then((m) => m.Detalhe),
  },
  ...[
    ['ensino/materiais', 'Materiais'],
    ['biblioteca', 'Biblioteca'],
    ['pesquisa', 'Pesquisa'],
    ['pesquisa/projetos', 'Projetos de pesquisa'],
    ['pesquisa/linhas', 'Linhas de pesquisa'],
    ['extensao', 'Extensão'],
    ['extensao/projetos', 'Projetos de extensão'],
    ['extensao/eventos', 'Eventos'],
    ['producao', 'Produção'],
    ['producao/publicacoes', 'Publicações'],
    ['producao/produtos', 'Produtos educacionais'],
    ['contato', 'Contato'],
  ].map(([path, titulo]) => ({
    path,
    title: `GPET - ${titulo}`,
    data: { titulo },
    loadComponent: institucional,
  })),
  {
    path: '**',
    title: 'GPET - Página não encontrada',
    data: { titulo: 'Página não encontrada', mensagem: 'O endereço solicitado não existe.' },
    loadComponent: institucional,
  },
];
