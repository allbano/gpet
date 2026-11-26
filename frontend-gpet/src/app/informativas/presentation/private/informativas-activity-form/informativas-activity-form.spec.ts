import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { InformativasPrivateManagerFacade } from '../../../application/informativas-private-manager.facade';
import {
  ATIVIDADE_INFORMATIVA_REPOSITORY,
  AtividadeInformativaRepository,
} from '../../../domain/atividade-informativa-repository.port';
import {
  MODALIDADE_REPOSITORY,
  ModalidadeRepository,
} from '../../../domain/modalidade-repository.port';
import { InformativasActivityForm } from './informativas-activity-form';

describe('InformativasActivityForm', () => {
  let fixture: ComponentFixture<InformativasActivityForm>;
  let atividadeRepo: Partial<AtividadeInformativaRepository>;
  let modalidadeRepo: Partial<ModalidadeRepository>;
  let router: Router;

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
      obterPrivadaPorId: vi.fn().mockResolvedValue({
        id: 'info-1',
        classificacao: 'Cartilha',
        classificacao_id: 'mod-1',
        meio: 'IMPRESSO',
        titulo: 'Cartilha GPET',
        descricao: 'Resumo da cartilha',
        conteudo: 'Conteúdo completo',
        publico_alvo: 'Comunidade externa',
        carga_horaria_minutos: null,
        publicacao_publica: true,
        agenda_pesquisa: false,
        periodos: [],
      }),
      criar: vi.fn().mockResolvedValue({ id: 'nova-info' }),
      editar: vi.fn().mockResolvedValue(undefined),
      excluir: vi.fn().mockResolvedValue(undefined),
    };
    modalidadeRepo = {
      listar: vi.fn().mockResolvedValue([
        { id: 'mod-1', nome: 'Cartilha' },
        { id: 'mod-2', nome: 'Boletim' },
      ]),
    };

    await TestBed.configureTestingModule({
      imports: [InformativasActivityForm],
      providers: [
        provideRouter([]),
        InformativasPrivateManagerFacade,
        { provide: ATIVIDADE_INFORMATIVA_REPOSITORY, useValue: atividadeRepo },
        { provide: MODALIDADE_REPOSITORY, useValue: modalidadeRepo },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('deve criar atividade informativa sem carga horária e navegar para edição', async () => {
    fixture = TestBed.createComponent(InformativasActivityForm);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const select = el.querySelector('#informativa-classificacao') as HTMLSelectElement;
    const titulo = el.querySelector('#informativa-titulo') as HTMLInputElement;
    const descricao = el.querySelector('#informativa-descricao') as HTMLTextAreaElement;
    const publico = el.querySelector('#informativa-publico') as HTMLInputElement;

    select.value = 'mod-1';
    select.dispatchEvent(new Event('input'));
    select.dispatchEvent(new Event('change'));
    titulo.value = 'Cartilha Impressa';
    titulo.dispatchEvent(new Event('input'));
    descricao.value = 'Material de divulgação';
    descricao.dispatchEvent(new Event('input'));
    publico.value = 'Comunidade externa';
    publico.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(atividadeRepo.criar).toHaveBeenCalledWith(
      expect.objectContaining({
        classificacao_id: 'mod-1',
        titulo: 'Cartilha Impressa',
        carga_horaria_minutos: null,
      }),
    );
    expect(router.navigate).toHaveBeenCalledWith([
      '/private/informativas/atividades',
      'nova-info',
    ]);
  });

  it('deve exigir conteúdo quando publicacao_publica estiver marcada', async () => {
    fixture = TestBed.createComponent(InformativasActivityForm);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const select = el.querySelector('#informativa-classificacao') as HTMLSelectElement;
    const titulo = el.querySelector('#informativa-titulo') as HTMLInputElement;
    const descricao = el.querySelector('#informativa-descricao') as HTMLTextAreaElement;
    const publico = el.querySelector('#informativa-publico') as HTMLInputElement;
    const publica = el.querySelector('#informativa-publica') as HTMLInputElement;

    select.value = 'mod-1';
    select.dispatchEvent(new Event('input'));
    select.dispatchEvent(new Event('change'));
    titulo.value = 'Boletim';
    titulo.dispatchEvent(new Event('input'));
    descricao.value = 'Resumo';
    descricao.dispatchEvent(new Event('input'));
    publico.value = 'Todos';
    publico.dispatchEvent(new Event('input'));
    publica.checked = true;
    publica.dispatchEvent(new Event('input'));
    publica.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(atividadeRepo.criar).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Para publicar, preencha o conteúdo');
  });
});
