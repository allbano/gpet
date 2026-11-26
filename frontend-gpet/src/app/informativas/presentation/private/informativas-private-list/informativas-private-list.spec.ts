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
import { InformativasPrivateList } from './informativas-private-list';

describe('InformativasPrivateList', () => {
  let fixture: ComponentFixture<InformativasPrivateList>;
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
    atividadeRepo = {
      listarPrivadas: vi.fn().mockResolvedValue({
        itens: [
          {
            id: 'info-1',
            titulo: 'Boletim Mensal',
            descricao: 'Resumo informativo',
            meio: 'ONLINE',
            classificacao_id: 'm1',
            classificacao: 'Boletim',
          },
        ],
        proximo_cursor: null,
      }),
      excluir: vi.fn().mockResolvedValue(undefined),
    };
    modalidadeRepo = {};

    await TestBed.configureTestingModule({
      imports: [InformativasPrivateList],
      providers: [
        provideRouter([]),
        InformativasPrivateManagerFacade,
        { provide: ATIVIDADE_INFORMATIVA_REPOSITORY, useValue: atividadeRepo },
        { provide: MODALIDADE_REPOSITORY, useValue: modalidadeRepo },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InformativasPrivateList);
  });

  it('deve listar atividades informativas e confirmar exclusão', async () => {
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Boletim Mensal');

    const deleteBtn = fixture.nativeElement.querySelector(
      'button[data-action="request-delete"]',
    ) as HTMLButtonElement;
    deleteBtn.click();
    await fixture.whenStable();

    const confirmBtn = fixture.nativeElement.querySelector(
      'button[data-action="confirm"]',
    ) as HTMLButtonElement;
    confirmBtn.click();
    await fixture.whenStable();

    expect(atividadeRepo.excluir).toHaveBeenCalledWith('info-1');
  });
});
