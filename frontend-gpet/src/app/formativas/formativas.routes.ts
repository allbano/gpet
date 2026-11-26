import { Routes } from '@angular/router';
import { provideFormativasInfrastructure } from './infrastructure/formativas.providers';
import { FormativasActivityForm } from './presentation/private/formativas-activity-form/formativas-activity-form';
import { FormativasAgendaView } from './presentation/private/formativas-agenda-view/formativas-agenda-view';
import { FormativasPrivateList } from './presentation/private/formativas-private-list/formativas-private-list';
import { FormativasPrivateShell } from './presentation/private/formativas-private-shell/formativas-private-shell';
import { FormativasTiposManager } from './presentation/private/formativas-tipos-manager/formativas-tipos-manager';
import { FormativasPublicDetail } from './presentation/public/formativas-public-detail/formativas-public-detail';
import { FormativasPublicList } from './presentation/public/formativas-public-list/formativas-public-list';

export const FORMATIVAS_PUBLIC_ROUTES: Routes = [
  {
    path: '',
    providers: [provideFormativasInfrastructure()],
    children: [
      {
        path: '',
        component: FormativasPublicList,
        title: 'Atividades Formativas — Público | GPET',
      },
      {
        path: 'atividades/:id',
        component: FormativasPublicDetail,
        title: 'Detalhe da Atividade Formativa | GPET',
      },
    ],
  },
];

export const FORMATIVAS_PRIVATE_ROUTES: Routes = [
  {
    path: '',
    providers: [provideFormativasInfrastructure()],
    component: FormativasPrivateShell,
    children: [
      { path: '', redirectTo: 'atividades', pathMatch: 'full' },
      {
        path: 'atividades',
        component: FormativasPrivateList,
        title: 'Gerenciar Atividades Formativas | GPET',
      },
      {
        path: 'atividades/nova',
        component: FormativasActivityForm,
        title: 'Nova Atividade Formativa | GPET',
      },
      {
        path: 'atividades/:id',
        component: FormativasActivityForm,
        title: 'Editar Atividade Formativa | GPET',
      },
      {
        path: 'tipos-atividade',
        component: FormativasTiposManager,
        title: 'Tipos de Atividade Formativa | GPET',
      },
      {
        path: 'agenda',
        component: FormativasAgendaView,
        title: 'Agenda Formativa | GPET',
      },
    ],
  },
];
