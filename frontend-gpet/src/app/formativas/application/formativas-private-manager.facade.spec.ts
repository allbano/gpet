import { TestBed } from '@angular/core/testing';
import { NotificationStore } from '../../core/notifications/notification.store';
import {
  ATIVIDADE_FORMATIVA_REPOSITORY,
  AtividadeFormativaRepository,
} from '../domain/atividade-formativa-repository.port';
import { DetalheFormativo } from '../domain/atividade-formativa.model';
import {
  TIPO_ATIVIDADE_REPOSITORY,
  TipoAtividadeRepository,
} from '../domain/tipo-atividade-repository.port';
import { FormativasPrivateManagerFacade } from './formativas-private-manager.facade';

describe('FormativasPrivateManagerFacade', () => {
  let facade: FormativasPrivateManagerFacade;
  let atividadeRepo: Partial<AtividadeFormativaRepository>;
  let tipoRepo: Partial<TipoAtividadeRepository>;
  let notifications: NotificationStore;

  const detalheExemplo: DetalheFormativo = {
    id: 'ativ-1',
    classificacao: 'Minicurso',
    classificacao_id: 'tipo-1',
    meio: 'HIBRIDO',
    titulo: 'Minicurso',
    descricao: 'Resumo',
    conteudo: 'Conteúdo',
    publico_alvo: 'Graduação',
    carga_horaria_minutos: 120,
    publicacao_publica: true,
    agenda_pesquisa: true,
    periodos: [],
  };

  beforeEach(() => {
    atividadeRepo = {
      listarPrivadas: vi.fn().mockResolvedValue({ itens: [], proximo_cursor: null }),
      obterPrivadaPorId: vi.fn().mockResolvedValue(detalheExemplo),
      criar: vi.fn().mockResolvedValue({ id: 'ativ-1' }),
      editar: vi.fn().mockResolvedValue(undefined),
      excluir: vi.fn().mockResolvedValue(undefined),
      adicionarPeriodo: vi.fn().mockResolvedValue({ id: 'per-1' }),
      editarPeriodo: vi.fn().mockResolvedValue(undefined),
      excluirPeriodo: vi.fn().mockResolvedValue(undefined),
      consultarAgenda: vi.fn().mockResolvedValue({ itens: [], proximo_cursor: null }),
    };

    tipoRepo = {
      listar: vi.fn().mockResolvedValue([{ id: 'tipo-1', nome: 'Minicurso' }]),
      criar: vi.fn().mockResolvedValue({ id: 'tipo-2' }),
      renomear: vi.fn().mockResolvedValue(undefined),
      excluir: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        FormativasPrivateManagerFacade,
        { provide: ATIVIDADE_FORMATIVA_REPOSITORY, useValue: atividadeRepo },
        { provide: TIPO_ATIVIDADE_REPOSITORY, useValue: tipoRepo },
      ],
    });

    facade = TestBed.inject(FormativasPrivateManagerFacade);
    notifications = TestBed.inject(NotificationStore);
  });

  it('deve criar, editar e excluir atividade notificando o usuário', async () => {
    const id = await facade.criarAtividade({
      classificacao_id: 'tipo-1',
      meio: 'HIBRIDO',
      titulo: 'Minicurso',
      descricao: 'Resumo',
      conteudo: '',
      publico_alvo: 'Graduação',
      carga_horaria_minutos: null,
      publicacao_publica: false,
      agenda_pesquisa: false,
    });

    expect(id).toBe('ativ-1');
    expect(notifications.notifications().at(-1)?.tipo).toBe('success');

    const editado = await facade.editarAtividade('ativ-1', detalheExemplo, {
      ...detalheExemplo,
      titulo: 'Minicurso Editado',
    });
    expect(editado).toBe(true);
    expect(atividadeRepo.editar).toHaveBeenCalledWith('ativ-1', { titulo: 'Minicurso Editado' });

    const excluido = await facade.excluirAtividade('ativ-1');
    expect(excluido).toBe(true);
  });

  it('deve recarregar atividade após adicionar período e gerenciar tipos de atividade', async () => {
    const okPeriodo = await facade.adicionarPeriodo('ativ-1', {
      inicio: '2026-12-07T11:00:00Z',
      termino: '2026-12-07T15:00:00Z',
      fuso: 'America/Sao_Paulo',
    });
    expect(okPeriodo).toBe(true);
    expect(atividadeRepo.obterPrivadaPorId).toHaveBeenCalledWith('ativ-1');

    await facade.carregarTipos();
    expect(facade.tipos()).toEqual([{ id: 'tipo-1', nome: 'Minicurso' }]);

    const okTipo = await facade.criarTipo('Seminário');
    expect(okTipo).toBe(true);
    expect(tipoRepo.listar).toHaveBeenCalledTimes(2);
  });
});
