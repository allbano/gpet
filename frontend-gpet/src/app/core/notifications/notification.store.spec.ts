import { TestBed } from '@angular/core/testing';
import { NotificationStore } from './notification.store';

describe('NotificationStore', () => {
  let store: NotificationStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(NotificationStore);
  });

  it('deve iniciar sem notificações', () => {
    expect(store.notifications()).toEqual([]);
  });

  it('deve adicionar notificações de sucesso, erro e info e removê-las por id', () => {
    const id1 = store.success('Atividade criada.');
    const id2 = store.error('Falha ao excluir.');
    const id3 = store.info('Sessão atualizada.');

    expect(store.notifications().map((n) => ({ tipo: n.tipo, mensagem: n.mensagem }))).toEqual([
      { tipo: 'success', mensagem: 'Atividade criada.' },
      { tipo: 'error', mensagem: 'Falha ao excluir.' },
      { tipo: 'info', mensagem: 'Sessão atualizada.' },
    ]);

    store.dismiss(id2);
    expect(store.notifications().map((n) => n.id)).toEqual([id1, id3]);

    store.clear();
    expect(store.notifications()).toEqual([]);
  });
});
