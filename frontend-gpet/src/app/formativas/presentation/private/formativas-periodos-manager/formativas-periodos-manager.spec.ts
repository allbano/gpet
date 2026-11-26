import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormativasPrivateManagerFacade } from '../../../application/formativas-private-manager.facade';
import {
  ATIVIDADE_FORMATIVA_REPOSITORY,
  AtividadeFormativaRepository,
} from '../../../domain/atividade-formativa-repository.port';
import {
  TIPO_ATIVIDADE_REPOSITORY,
  TipoAtividadeRepository,
} from '../../../domain/tipo-atividade-repository.port';
import { FormativasPeriodosManager } from './formativas-periodos-manager';

describe('FormativasPeriodosManager', () => {
  let fixture: ComponentFixture<FormativasPeriodosManager>;
  let atividadeRepo: Partial<AtividadeFormativaRepository>;
  let tipoRepo: Partial<TipoAtividadeRepository>;

  beforeAll(() => {
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      };
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function (this: HTMLDialogElement, returnValue?: string) {
        this.removeAttribute('open');
        if (returnValue !== undefined) {
          this.returnValue = returnValue;
        }
        this.dispatchEvent(new Event('close'));
      };
    }
  });

  beforeEach(async () => {
    atividadeRepo = {
      adicionarPeriodo: vi.fn().mockResolvedValue({ id: 'p2' }),
      editarPeriodo: vi.fn().mockResolvedValue(undefined),
      excluirPeriodo: vi.fn().mockResolvedValue(undefined),
      obterPrivadaPorId: vi.fn().mockResolvedValue({
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
      }),
    };
    tipoRepo = {};

    await TestBed.configureTestingModule({
      imports: [FormativasPeriodosManager],
      providers: [
        FormativasPrivateManagerFacade,
        { provide: ATIVIDADE_FORMATIVA_REPOSITORY, useValue: atividadeRepo },
        { provide: TIPO_ATIVIDADE_REPOSITORY, useValue: tipoRepo },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormativasPeriodosManager);
    fixture.componentRef.setInput('atividadeId', 'ativ-1');
    fixture.componentRef.setInput('periodos', [
      {
        id: 'p1',
        inicio: '2026-12-07T11:00:00Z',
        termino: '2026-12-07T15:00:00Z',
        fuso: 'America/Sao_Paulo',
      },
    ]);
  });

  it('deve listar períodos existentes e validar término posterior ao início ao adicionar', async () => {
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('07/12/2026');
    expect(el.textContent).toContain('08:00 – 12:00');

    const inicioInput = el.querySelector('#periodo-inicio') as HTMLInputElement;
    const terminoInput = el.querySelector('#periodo-termino') as HTMLInputElement;
    inicioInput.value = '2026-12-08T08:00';
    inicioInput.dispatchEvent(new Event('input'));
    terminoInput.value = '2026-12-08T12:00';
    terminoInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(atividadeRepo.adicionarPeriodo).toHaveBeenCalledWith('ativ-1', {
      inicio: '2026-12-08T11:00:00.000Z',
      termino: '2026-12-08T15:00:00.000Z',
      fuso: 'America/Sao_Paulo',
    });
  });

  it('deve remover período após confirmação no dialog', async () => {
    await fixture.whenStable();
    const removeBtn = fixture.nativeElement.querySelector(
      'button[data-action="remove-period"]',
    ) as HTMLButtonElement;
    removeBtn.click();
    await fixture.whenStable();

    const confirmBtn = fixture.nativeElement.querySelector(
      'button[data-action="confirm"]',
    ) as HTMLButtonElement;
    confirmBtn.click();
    await fixture.whenStable();

    expect(atividadeRepo.excluirPeriodo).toHaveBeenCalledWith('ativ-1', 'p1');
  });
});
