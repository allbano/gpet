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
import { FormativasTiposManager } from './formativas-tipos-manager';

describe('FormativasTiposManager', () => {
  let fixture: ComponentFixture<FormativasTiposManager>;
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
    atividadeRepo = {};
    tipoRepo = {
      listar: vi.fn().mockResolvedValue([{ id: 't1', nome: 'Minicurso' }]),
      criar: vi.fn().mockResolvedValue({ id: 't2' }),
      renomear: vi.fn().mockResolvedValue(undefined),
      excluir: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [FormativasTiposManager],
      providers: [
        FormativasPrivateManagerFacade,
        { provide: ATIVIDADE_FORMATIVA_REPOSITORY, useValue: atividadeRepo },
        { provide: TIPO_ATIVIDADE_REPOSITORY, useValue: tipoRepo },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormativasTiposManager);
  });

  it('deve listar tipos de atividade, criar novo e excluir com confirmação', async () => {
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Minicurso');

    const nomeInput = el.querySelector('#novo-tipo-nome') as HTMLInputElement;
    nomeInput.value = 'Laboratório';
    nomeInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(tipoRepo.criar).toHaveBeenCalledWith('Laboratório');

    const deleteBtn = el.querySelector('button[data-action="delete-tipo"]') as HTMLButtonElement;
    deleteBtn.click();
    await fixture.whenStable();

    const confirmBtn = el.querySelector('button[data-action="confirm"]') as HTMLButtonElement;
    confirmBtn.click();
    await fixture.whenStable();

    expect(tipoRepo.excluir).toHaveBeenCalledWith('t1');
  });
});
