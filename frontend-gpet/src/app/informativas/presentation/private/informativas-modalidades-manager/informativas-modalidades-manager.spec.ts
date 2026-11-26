import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InformativasPrivateManagerFacade } from '../../../application/informativas-private-manager.facade';
import {
  ATIVIDADE_INFORMATIVA_REPOSITORY,
  AtividadeInformativaRepository,
} from '../../../domain/atividade-informativa-repository.port';
import {
  MODALIDADE_REPOSITORY,
  ModalidadeRepository,
} from '../../../domain/modalidade-repository.port';
import { InformativasModalidadesManager } from './informativas-modalidades-manager';

describe('InformativasModalidadesManager', () => {
  let fixture: ComponentFixture<InformativasModalidadesManager>;
  let atividadeRepo: Partial<AtividadeInformativaRepository>;
  let modalidadeRepo: Partial<ModalidadeRepository>;

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
    modalidadeRepo = {
      listar: vi.fn().mockResolvedValue([{ id: 'm1', nome: 'Cartilha' }]),
      criar: vi.fn().mockResolvedValue({ id: 'm2' }),
      renomear: vi.fn().mockResolvedValue(undefined),
      excluir: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [InformativasModalidadesManager],
      providers: [
        InformativasPrivateManagerFacade,
        { provide: ATIVIDADE_INFORMATIVA_REPOSITORY, useValue: atividadeRepo },
        { provide: MODALIDADE_REPOSITORY, useValue: modalidadeRepo },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InformativasModalidadesManager);
  });

  it('deve listar modalidades, cadastrar nova e excluir com confirmação', async () => {
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Cartilha');

    const nomeInput = el.querySelector('#nova-modalidade-nome') as HTMLInputElement;
    nomeInput.value = 'Boletim Técnico';
    nomeInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(modalidadeRepo.criar).toHaveBeenCalledWith('Boletim Técnico');

    const deleteBtn = el.querySelector('button[data-action="delete-modalidade"]') as HTMLButtonElement;
    deleteBtn.click();
    await fixture.whenStable();

    const confirmBtn = el.querySelector('button[data-action="confirm"]') as HTMLButtonElement;
    confirmBtn.click();
    await fixture.whenStable();

    expect(modalidadeRepo.excluir).toHaveBeenCalledWith('m1');
  });
});
