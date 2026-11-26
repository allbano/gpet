import { TestBed } from '@angular/core/testing';
import {
  ATIVIDADE_INFORMATIVA_REPOSITORY,
  AtividadeInformativaRepository,
} from '../domain/atividade-informativa-repository.port';
import { InformativasPublicCatalogFacade } from './informativas-public-catalog.facade';

describe('InformativasPublicCatalogFacade', () => {
  let facade: InformativasPublicCatalogFacade;
  let repoMock: Partial<AtividadeInformativaRepository>;

  beforeEach(() => {
    repoMock = {
      listarPublicas: vi.fn().mockResolvedValue({
        itens: [
          {
            id: 'info-1',
            titulo: 'Cartilha GPET',
            descricao: 'Divulgação',
            meio: 'IMPRESSO',
            classificacao_id: 'm1',
            classificacao: 'Cartilha',
          },
        ],
        proximo_cursor: null,
      }),
      obterPublicaPorId: vi.fn().mockResolvedValue({
        id: 'info-1',
        classificacao: 'Cartilha',
        classificacao_id: 'm1',
        meio: 'IMPRESSO',
        titulo: 'Cartilha GPET',
        descricao: 'Divulgação',
        conteudo: 'Conteúdo completo da cartilha',
        publico_alvo: 'Comunidade externa',
        carga_horaria_minutos: null,
        publicacao_publica: true,
        agenda_pesquisa: false,
        periodos: [],
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        InformativasPublicCatalogFacade,
        { provide: ATIVIDADE_INFORMATIVA_REPOSITORY, useValue: repoMock },
      ],
    });
    facade = TestBed.inject(InformativasPublicCatalogFacade);
  });

  it('deve carregar cartões públicos e detalhe sem períodos', async () => {
    await facade.carregarPrimeiraPagina();
    expect(facade.cartoes().length).toBe(1);

    await facade.carregarDetalhe('info-1');
    expect(facade.detalhe()?.carga_horaria_minutos).toBeNull();
    expect(facade.detalhe()?.periodos).toEqual([]);
  });
});
