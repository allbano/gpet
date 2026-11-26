import { TestBed } from '@angular/core/testing';
import {
  ATIVIDADE_INFORMATIVA_REPOSITORY,
  AtividadeInformativaRepository,
} from '../domain/atividade-informativa-repository.port';
import {
  MODALIDADE_REPOSITORY,
  ModalidadeRepository,
} from '../domain/modalidade-repository.port';
import { InformativasPrivateManagerFacade } from './informativas-private-manager.facade';

describe('InformativasPrivateManagerFacade', () => {
  let facade: InformativasPrivateManagerFacade;
  let atividadeRepo: Partial<AtividadeInformativaRepository>;
  let modalidadeRepo: Partial<ModalidadeRepository>;

  beforeEach(() => {
    atividadeRepo = {
      listarPrivadas: vi.fn().mockResolvedValue({ itens: [], proximo_cursor: null }),
      obterPrivadaPorId: vi.fn().mockResolvedValue({
        id: 'info-1',
        classificacao: 'Cartilha',
        classificacao_id: 'm1',
        meio: 'IMPRESSO',
        titulo: 'Cartilha',
        descricao: 'Resumo',
        conteudo: 'Texto',
        publico_alvo: 'Todos',
        carga_horaria_minutos: null,
        publicacao_publica: true,
        agenda_pesquisa: false,
        periodos: [],
      }),
      criar: vi.fn().mockResolvedValue({ id: 'info-1' }),
      editar: vi.fn().mockResolvedValue(undefined),
      excluir: vi.fn().mockResolvedValue(undefined),
      adicionarPeriodo: vi.fn().mockResolvedValue({ id: 'p1' }),
    };
    modalidadeRepo = {
      listar: vi.fn().mockResolvedValue([{ id: 'm1', nome: 'Cartilha' }]),
      criar: vi.fn().mockResolvedValue({ id: 'm2' }),
    };

    TestBed.configureTestingModule({
      providers: [
        InformativasPrivateManagerFacade,
        { provide: ATIVIDADE_INFORMATIVA_REPOSITORY, useValue: atividadeRepo },
        { provide: MODALIDADE_REPOSITORY, useValue: modalidadeRepo },
      ],
    });
    facade = TestBed.inject(InformativasPrivateManagerFacade);
  });

  it('deve criar atividade informativa e gerenciar modalidades', async () => {
    const id = await facade.criarAtividade({
      classificacao_id: 'm1',
      meio: 'IMPRESSO',
      titulo: 'Cartilha',
      descricao: 'Resumo',
      conteudo: 'Texto',
      publico_alvo: 'Todos',
      carga_horaria_minutos: null,
      publicacao_publica: true,
      agenda_pesquisa: false,
    });
    expect(id).toBe('info-1');

    await facade.carregarModalidades();
    expect(facade.modalidades()).toEqual([{ id: 'm1', nome: 'Cartilha' }]);
  });
});
