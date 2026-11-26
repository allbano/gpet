import { TestBed } from '@angular/core/testing';
import {
  ATIVIDADE_FORMATIVA_REPOSITORY,
  AtividadeFormativaRepository,
} from '../domain/atividade-formativa-repository.port';
import { FormativasPublicCatalogFacade } from './formativas-public-catalog.facade';

describe('FormativasPublicCatalogFacade', () => {
  let facade: FormativasPublicCatalogFacade;
  let repoMock: Partial<AtividadeFormativaRepository>;

  beforeEach(() => {
    repoMock = {
      listarPublicas: vi.fn(),
      obterPublicaPorId: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        FormativasPublicCatalogFacade,
        { provide: ATIVIDADE_FORMATIVA_REPOSITORY, useValue: repoMock },
      ],
    });
    facade = TestBed.inject(FormativasPublicCatalogFacade);
  });

  it('deve carregar primeira página, paginar por cursor sem duplicatas e carregar detalhe', async () => {
    const listarMock = repoMock.listarPublicas as ReturnType<typeof vi.fn>;
    listarMock
      .mockResolvedValueOnce({
        itens: [
          {
            id: '1',
            titulo: 'A1',
            descricao: 'D1',
            meio: 'ONLINE',
            classificacao_id: 'c1',
            classificacao: 'Oficina',
          },
        ],
        proximo_cursor: 'cursor-1',
      })
      .mockResolvedValueOnce({
        itens: [
          {
            id: '1',
            titulo: 'A1',
            descricao: 'D1',
            meio: 'ONLINE',
            classificacao_id: 'c1',
            classificacao: 'Oficina',
          },
          {
            id: '2',
            titulo: 'A2',
            descricao: 'D2',
            meio: 'HIBRIDO',
            classificacao_id: 'c1',
            classificacao: 'Oficina',
          },
        ],
        proximo_cursor: null,
      });

    await facade.carregarPrimeiraPagina();
    expect(facade.cartoes().length).toBe(1);
    expect(facade.proximoCursor()).toBe('cursor-1');

    await facade.carregarMais();
    expect(facade.cartoes().map((c) => c.id)).toEqual(['1', '2']);
    expect(facade.proximoCursor()).toBeNull();

    const detalheMock = repoMock.obterPublicaPorId as ReturnType<typeof vi.fn>;
    detalheMock.mockResolvedValueOnce({
      id: '1',
      classificacao: 'Oficina',
      classificacao_id: 'c1',
      meio: 'ONLINE',
      titulo: 'A1',
      descricao: 'D1',
      conteudo: 'Conteúdo',
      publico_alvo: 'Todos',
      carga_horaria_minutos: 60,
      publicacao_publica: true,
      agenda_pesquisa: false,
      periodos: [],
    });

    await facade.carregarDetalhe('1');
    expect(facade.detalhe()?.titulo).toBe('A1');
    expect(facade.erroDetalhe()).toBeNull();
  });

  it('deve expor erro amigável quando detalhe falhar', async () => {
    const detalheMock = repoMock.obterPublicaPorId as ReturnType<typeof vi.fn>;
    detalheMock.mockRejectedValueOnce({
      kind: 'not_found',
      status: 404,
      mensagem: 'Recurso não encontrado',
    });

    await facade.carregarDetalhe('inexistente');
    expect(facade.detalhe()).toBeNull();
    expect(facade.erroDetalhe()?.kind).toBe('not_found');
  });
});
