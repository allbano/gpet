import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { InformativasPrivateManagerFacade } from '../../../application/informativas-private-manager.facade';
import {
  ATIVIDADE_INFORMATIVA_REPOSITORY,
  AtividadeInformativaRepository,
} from '../../../domain/atividade-informativa-repository.port';
import {
  MODALIDADE_REPOSITORY,
  ModalidadeRepository,
} from '../../../domain/modalidade-repository.port';
import { InformativasAgendaView } from './informativas-agenda-view';

describe('InformativasAgendaView', () => {
  let fixture: ComponentFixture<InformativasAgendaView>;
  let atividadeRepo: Partial<AtividadeInformativaRepository>;
  let modalidadeRepo: Partial<ModalidadeRepository>;

  beforeEach(async () => {
    atividadeRepo = {
      consultarAgenda: vi.fn().mockResolvedValue({
        itens: [
          {
            atividade_id: 'info-1',
            periodo_id: 'per-1',
            titulo: 'Lançamento da Cartilha',
            descricao: 'Apresentação pública',
            natureza: 'Cartilha',
            meio: 'IMPRESSO',
            publico_alvo: 'Comunidade externa',
            inicio: '2026-12-10T17:00:00Z',
            termino: '2026-12-10T19:00:00Z',
            fuso: 'America/Sao_Paulo',
          },
        ],
        proximo_cursor: null,
      }),
    };
    modalidadeRepo = {};

    await TestBed.configureTestingModule({
      imports: [InformativasAgendaView],
      providers: [
        provideRouter([]),
        InformativasPrivateManagerFacade,
        { provide: ATIVIDADE_INFORMATIVA_REPOSITORY, useValue: atividadeRepo },
        { provide: MODALIDADE_REPOSITORY, useValue: modalidadeRepo },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InformativasAgendaView);
  });

  it('deve consultar agenda informativa e exibir ocorrências', async () => {
    await fixture.whenStable();
    expect(atividadeRepo.consultarAgenda).toHaveBeenCalledTimes(1);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Lançamento da Cartilha');
    expect(el.textContent).toContain('10/12/2026');
    expect(el.textContent).toContain('14:00 – 16:00');
  });
});
