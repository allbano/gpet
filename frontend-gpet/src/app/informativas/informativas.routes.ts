import { Routes } from '@angular/router';
import { provideInformativasInfrastructure } from './infrastructure/informativas.providers';
import { InformativasActivityForm } from './presentation/private/informativas-activity-form/informativas-activity-form';
import { InformativasAgendaView } from './presentation/private/informativas-agenda-view/informativas-agenda-view';
import { InformativasModalidadesManager } from './presentation/private/informativas-modalidades-manager/informativas-modalidades-manager';
import { InformativasPrivateList } from './presentation/private/informativas-private-list/informativas-private-list';
import { InformativasPrivateShell } from './presentation/private/informativas-private-shell/informativas-private-shell';
import { InformativasPublicDetail } from './presentation/public/informativas-public-detail/informativas-public-detail';
import { InformativasPublicList } from './presentation/public/informativas-public-list/informativas-public-list';

export const INFORMATIVAS_PUBLIC_ROUTES: Routes = [
  {
    path: '',
    providers: [provideInformativasInfrastructure()],
    children: [
      {
        path: '',
        component: InformativasPublicList,
        title: 'Atividades Informativas — Público | GPET',
      },
      {
        path: 'atividades/:id',
        component: InformativasPublicDetail,
        title: 'Detalhe da Atividade Informativa | GPET',
      },
    ],
  },
];

export const INFORMATIVAS_PRIVATE_ROUTES: Routes = [
  {
    path: '',
    providers: [provideInformativasInfrastructure()],
    component: InformativasPrivateShell,
    children: [
      { path: '', redirectTo: 'atividades', pathMatch: 'full' },
      {
        path: 'atividades',
        component: InformativasPrivateList,
        title: 'Gerenciar Atividades Informativas | GPET',
      },
      {
        path: 'atividades/nova',
        component: InformativasActivityForm,
        title: 'Nova Atividade Informativa | GPET',
      },
      {
        path: 'atividades/:id',
        component: InformativasActivityForm,
        title: 'Editar Atividade Informativa | GPET',
      },
      {
        path: 'modalidades',
        component: InformativasModalidadesManager,
        title: 'Modalidades Informativas | GPET',
      },
      {
        path: 'agenda',
        component: InformativasAgendaView,
        title: 'Agenda Informativa | GPET',
      },
    ],
  },
];
