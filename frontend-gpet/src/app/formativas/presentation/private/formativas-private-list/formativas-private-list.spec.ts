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
import { FormativasPrivateList } from './formativas-private-list';

describe('FormativasPrivateList', () => {
  let fixture: ComponentFixture<FormativasPrivateList>;
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
      listarPrivadas: vi.fn().mockResolvedValue({
        itens: [
          {
            id: 'ativ-1',
            titulo: 'Oficina de Métodos',
            descricao: 'Descrição breve',
            meio: 'PRESENCIAL',
            classificacao_id: 't1',
            classificacao: 'Oficina',
          },
        ],
        proximo_cursor: null,
      }),
      excluir: vi.fn().mockResolvedValue(undefined),
    };
    tipoRepo = {};

    await TestBed.configureTestingModule({
      imports: [FormativasPrivateList],
      providers: [
        provideRouter([]),
        FormativasPrivateManagerFacade,
        { provide: ATIVIDADE_FORMATIVA_REPOSITORY, useValue: atividadeRepo },
        { provide: TIPO_ATIVIDADE_REPOSITORY, useValue: tipoRepo },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormativasPrivateList);
  });

  it('deve listar atividades cadastradas e confirmar exclusão via dialog nativo', async () => {
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Oficina de Métodos');

    const deleteBtn = el.querySelector('button[data-action="request-delete"]') as HTMLButtonElement;
    deleteBtn.click();
    await fixture.whenStable();

    const confirmBtn = el.querySelector('button[data-action="confirm"]') as HTMLButtonElement;
    confirmBtn.click();
    await fixture.whenStable();

    expect(atividadeRepo.excluir).toHaveBeenCalledWith('ativ-1');
  });
});
