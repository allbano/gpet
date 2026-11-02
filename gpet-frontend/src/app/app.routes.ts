import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'GPET - Home',
    loadComponent: () =>
      import('./domains/institucional/presentation/pages/home/home').then((m) => m.Home),
  },
  { path: '**', redirectTo: '' },
];
