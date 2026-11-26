import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FormativasPrivateManagerFacade } from '../../../application/formativas-private-manager.facade';
import {
  ATIVIDADE_FORMATIVA_REPOSITORY,
  AtividadeFormativaRepository,
} from '../../../domain/atividade-formativa-repository.port';
import {
  TIPO_ATIVIDADE_REPOSITORY,
  TipoAtividadeRepository,
} from '../../../domain/tipo-atividade-repository.port';
import { FormativasAgendaView } from './formativas-agenda-view';

describe('FormativasAgendaView', () => {
  let fixture: ComponentFixture<FormativasAgendaView>;
  let atividadeRepo: Partial<AtividadeFormativaRepository>;
  let tipoRepo: Partial<TipoAtividadeRepository>;

  beforeEach(async () => {
    atividadeRepo = {
      consultarAgenda: vi.fn().mockResolvedValue({
        itens: [
          {
            atividade_id: 'ativ-1',
            periodo_id: 'per-1',
            titulo: 'Minicurso de pesquisa',
            descricao: 'Resumo',
            natureza: 'Minicurso',
            meio: 'HIBRIDO',
            publico_alvo: 'Graduação',
            inicio: '2026-12-07T11:00:00Z',
            termino: '2026-12-07T15:00:00Z',
            fuso: 'America/Sao_Paulo',
          },
        ],
        proximo_cursor: null,
      }),
    };
    tipoRepo = {};

    await TestBed.configureTestingModule({
      imports: [FormativasAgendaView],
      providers: [
        provideRouter([]),
        FormativasPrivateManagerFacade,
        { provide: ATIVIDADE_FORMATIVA_REPOSITORY, useValue: atividadeRepo },
        { provide: TIPO_ATIVIDADE_REPOSITORY, useValue: tipoRepo },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormativasAgendaView);
  });

  it('deve consultar a agenda ao inicializar e exibir ocorrências formatadas no fuso', async () => {
    await fixture.whenStable();
    expect(atividadeRepo.consultarAgenda).toHaveBeenCalledTimes(1);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Minicurso de pesquisa');
    expect(el.textContent).toContain('07/12/2026');
    expect(el.textContent).toContain('08:00 – 12:00');
  });
});
