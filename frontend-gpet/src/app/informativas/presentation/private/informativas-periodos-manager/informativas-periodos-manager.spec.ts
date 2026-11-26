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
import { InformativasPeriodosManager } from './informativas-periodos-manager';

describe('InformativasPeriodosManager', () => {
  let fixture: ComponentFixture<InformativasPeriodosManager>;
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
      adicionarPeriodo: vi.fn().mockResolvedValue({ id: 'p2' }),
      excluirPeriodo: vi.fn().mockResolvedValue(undefined),
      obterPrivadaPorId: vi.fn().mockResolvedValue({
        id: 'info-1',
        classificacao: 'Cartilha',
        classificacao_id: 'mod-1',
        meio: 'IMPRESSO',
        titulo: 'Cartilha',
        descricao: 'Resumo',
        conteudo: 'Texto',
        publico_alvo: 'Todos',
        carga_horaria_minutos: null,
        publicacao_publica: true,
        agenda_pesquisa: false,
        periodos: [],
      }),
    };
    modalidadeRepo = {};

    await TestBed.configureTestingModule({
      imports: [InformativasPeriodosManager],
      providers: [
        InformativasPrivateManagerFacade,
        { provide: ATIVIDADE_INFORMATIVA_REPOSITORY, useValue: atividadeRepo },
        { provide: MODALIDADE_REPOSITORY, useValue: modalidadeRepo },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InformativasPeriodosManager);
    fixture.componentRef.setInput('atividadeId', 'info-1');
    fixture.componentRef.setInput('periodos', []);
  });

  it('deve adicionar período de lançamento informativo válido', async () => {
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const inicioInput = el.querySelector('#info-periodo-inicio') as HTMLInputElement;
    const terminoInput = el.querySelector('#info-periodo-termino') as HTMLInputElement;

    inicioInput.value = '2026-12-10T14:00';
    inicioInput.dispatchEvent(new Event('input'));
    terminoInput.value = '2026-12-10T16:00';
    terminoInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(atividadeRepo.adicionarPeriodo).toHaveBeenCalledWith('info-1', {
      inicio: '2026-12-10T17:00:00.000Z',
      termino: '2026-12-10T19:00:00.000Z',
      fuso: 'America/Sao_Paulo',
    });
  });
});
