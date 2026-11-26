import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FormativasPublicCatalogFacade } from '../../../application/formativas-public-catalog.facade';
import {
  ATIVIDADE_FORMATIVA_REPOSITORY,
  AtividadeFormativaRepository,
} from '../../../domain/atividade-formativa-repository.port';
import { FormativasPublicDetail } from './formativas-public-detail';

describe('FormativasPublicDetail', () => {
  let fixture: ComponentFixture<FormativasPublicDetail>;
  let repoMock: Partial<AtividadeFormativaRepository>;

  beforeEach(async () => {
    repoMock = {
      obterPublicaPorId: vi.fn().mockResolvedValue({
        id: '019aa000-0001-7000-8000-000000000001',
        classificacao: 'Minicurso',
        classificacao_id: 'tipo-1',
        meio: 'HIBRIDO',
        titulo: 'Minicurso de pesquisa em três dias',
        descricao: 'Introdução aos métodos.',
        conteudo: 'Leitura orientada e práticas.',
        publico_alvo: 'Graduação',
        carga_horaria_minutos: 1140,
        publicacao_publica: true,
        agenda_pesquisa: true,
        periodos: [
          {
            id: 'p1',
            inicio: '2026-12-07T11:00:00Z',
            termino: '2026-12-07T15:00:00Z',
            fuso: 'America/Sao_Paulo',
          },
        ],
      }),
    };

    await TestBed.configureTestingModule({
      imports: [FormativasPublicDetail],
      providers: [
        provideRouter([]),
        FormativasPublicCatalogFacade,
        { provide: ATIVIDADE_FORMATIVA_REPOSITORY, useValue: repoMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormativasPublicDetail);
    fixture.componentRef.setInput('id', '019aa000-0001-7000-8000-000000000001');
  });

  it('deve renderizar conteúdo completo, carga horária e períodos formatados no fuso', async () => {
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Minicurso de pesquisa em três dias');
    expect(el.textContent).toContain('Leitura orientada e práticas.');
    expect(el.textContent).toContain('19h');
    expect(el.textContent).toContain('07/12/2026');
    expect(el.textContent).toContain('08:00 – 12:00');
  });

  it('deve exibir aviso amigável quando a atividade não possuir períodos', async () => {
    (repoMock.obterPublicaPorId as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: '019aa000-0001-7000-8000-000000000005',
      classificacao: 'Oficina',
      classificacao_id: 'tipo-2',
      meio: 'ONLINE',
      titulo: 'Oficina assíncrona',
      descricao: 'Resumo',
      conteudo: 'Material online.',
      publico_alvo: 'Todos',
      carga_horaria_minutos: null,
      publicacao_publica: true,
      agenda_pesquisa: false,
      periodos: [],
    });

    fixture.componentRef.setInput('id', '019aa000-0001-7000-8000-000000000005');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(
      'Esta atividade ainda não possui sessões agendadas.',
    );
  });
});
