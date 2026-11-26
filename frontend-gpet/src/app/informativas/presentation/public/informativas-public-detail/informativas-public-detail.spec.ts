import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { InformativasPublicCatalogFacade } from '../../../application/informativas-public-catalog.facade';
import {
  ATIVIDADE_INFORMATIVA_REPOSITORY,
  AtividadeInformativaRepository,
} from '../../../domain/atividade-informativa-repository.port';
import { InformativasPublicDetail } from './informativas-public-detail';

describe('InformativasPublicDetail', () => {
  let fixture: ComponentFixture<InformativasPublicDetail>;
  let repoMock: Partial<AtividadeInformativaRepository>;

  beforeEach(async () => {
    repoMock = {
      obterPublicaPorId: vi.fn().mockResolvedValue({
        id: 'info-1',
        classificacao: 'Cartilha',
        classificacao_id: 'mod-1',
        meio: 'IMPRESSO',
        titulo: 'Cartilha de divulgação científica',
        descricao: 'Introdução aos métodos.',
        conteudo: 'Texto completo da cartilha.',
        publico_alvo: 'Comunidade externa',
        carga_horaria_minutos: null,
        publicacao_publica: true,
        agenda_pesquisa: false,
        periodos: [],
      }),
    };

    await TestBed.configureTestingModule({
      imports: [InformativasPublicDetail],
      providers: [
        provideRouter([]),
        InformativasPublicCatalogFacade,
        { provide: ATIVIDADE_INFORMATIVA_REPOSITORY, useValue: repoMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InformativasPublicDetail);
    fixture.componentRef.setInput('id', 'info-1');
  });

  it('deve exibir cartilha sem carga horária e sem períodos definidos', async () => {
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Cartilha de divulgação científica');
    expect(el.textContent).toContain('Não informada');
    expect(el.textContent).toContain(
      'Esta atividade informativa está disponível sem datas de lançamento definidas.',
    );
  });
});
