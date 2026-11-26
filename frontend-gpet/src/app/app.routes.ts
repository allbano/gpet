import { Routes } from '@angular/router';
import { NotFound } from './shell/not-found/not-found';
import { PortalHome } from './shell/portal-home/portal-home';

export const routes: Routes = [
  {
    path: '',
    component: PortalHome,
    title: 'Portal GPET — Atividades Formativas e Informativas',
  },
  {
    path: 'public/formativas',
    loadChildren: () =>
      import('./formativas/formativas.routes').then((m) => m.FORMATIVAS_PUBLIC_ROUTES),
  },
  {
    path: 'private/formativas',
    loadChildren: () =>
      import('./formativas/formativas.routes').then((m) => m.FORMATIVAS_PRIVATE_ROUTES),
  },
  {
    path: 'public/informativas',
    loadChildren: () =>
      import('./informativas/informativas.routes').then((m) => m.INFORMATIVAS_PUBLIC_ROUTES),
  },
  {
    path: 'private/informativas',
    loadChildren: () =>
      import('./informativas/informativas.routes').then((m) => m.INFORMATIVAS_PRIVATE_ROUTES),
  },
  {
    path: '**',
    component: NotFound,
    title: 'Página não encontrada | GPET',
  },
];
