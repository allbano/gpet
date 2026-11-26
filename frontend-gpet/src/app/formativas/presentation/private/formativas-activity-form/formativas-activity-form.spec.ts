import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { FormativasPrivateManagerFacade } from '../../../application/formativas-private-manager.facade';
import {
  ATIVIDADE_FORMATIVA_REPOSITORY,
  AtividadeFormativaRepository,
} from '../../../domain/atividade-formativa-repository.port';
import {
  TIPO_ATIVIDADE_REPOSITORY,
  TipoAtividadeRepository,
} from '../../../domain/tipo-atividade-repository.port';
import { FormativasActivityForm } from './formativas-activity-form';

describe('FormativasActivityForm', () => {
  let fixture: ComponentFixture<FormativasActivityForm>;
  let atividadeRepo: Partial<AtividadeFormativaRepository>;
  let tipoRepo: Partial<TipoAtividadeRepository>;
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
        id: 'ativ-1',
        classificacao: 'Minicurso',
        classificacao_id: 'tipo-1',
        meio: 'HIBRIDO',
        titulo: 'Minicurso Original',
        descricao: 'Resumo original',
        conteudo: 'Conteúdo completo',
        publico_alvo: 'Graduação',
        carga_horaria_minutos: 90,
        publicacao_publica: true,
        agenda_pesquisa: false,
        periodos: [],
      }),
      criar: vi.fn().mockResolvedValue({ id: 'nova-ativ' }),
      editar: vi.fn().mockResolvedValue(undefined),
      excluir: vi.fn().mockResolvedValue(undefined),
    };
    tipoRepo = {
      listar: vi.fn().mockResolvedValue([
        { id: 'tipo-1', nome: 'Minicurso' },
        { id: 'tipo-2', nome: 'Oficina' },
      ]),
    };

    await TestBed.configureTestingModule({
      imports: [FormativasActivityForm],
      providers: [
        provideRouter([]),
        FormativasPrivateManagerFacade,
        { provide: ATIVIDADE_FORMATIVA_REPOSITORY, useValue: atividadeRepo },
        { provide: TIPO_ATIVIDADE_REPOSITORY, useValue: tipoRepo },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('deve exigir conteúdo quando publicacao_publica estiver marcada na criação', async () => {
    fixture = TestBed.createComponent(FormativasActivityForm);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const select = el.querySelector('#formativa-classificacao') as HTMLSelectElement;
    const titulo = el.querySelector('#formativa-titulo') as HTMLInputElement;
    const descricao = el.querySelector('#formativa-descricao') as HTMLTextAreaElement;
    const publico = el.querySelector('#formativa-publico') as HTMLInputElement;
    const checkboxPublica = el.querySelector('#formativa-publica') as HTMLInputElement;

    select.value = 'tipo-1';
    select.dispatchEvent(new Event('input'));
    select.dispatchEvent(new Event('change'));
    titulo.value = 'Oficina Teste';
    titulo.dispatchEvent(new Event('input'));
    descricao.value = 'Descrição teste';
    descricao.dispatchEvent(new Event('input'));
    publico.value = 'Pesquisadores';
    publico.dispatchEvent(new Event('input'));
    checkboxPublica.checked = true;
    checkboxPublica.dispatchEvent(new Event('input'));
    checkboxPublica.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(atividadeRepo.criar).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Para publicar, preencha o conteúdo');
  });

  it('deve criar atividade formativa válida e navegar para edição para cadastrar períodos', async () => {
    fixture = TestBed.createComponent(FormativasActivityForm);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const select = el.querySelector('#formativa-classificacao') as HTMLSelectElement;
    const titulo = el.querySelector('#formativa-titulo') as HTMLInputElement;
    const descricao = el.querySelector('#formativa-descricao') as HTMLTextAreaElement;
    const publico = el.querySelector('#formativa-publico') as HTMLInputElement;

    select.value = 'tipo-1';
    select.dispatchEvent(new Event('input'));
    select.dispatchEvent(new Event('change'));
    titulo.value = 'Seminário GPET';
    titulo.dispatchEvent(new Event('input'));
    descricao.value = 'Discussão científica';
    descricao.dispatchEvent(new Event('input'));
    publico.value = 'Graduação';
    publico.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(atividadeRepo.criar).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith([
      '/private/formativas/atividades',
      'nova-ativ',
    ]);
  });

  it('deve carregar atividade existente no modo edição e enviar patch mínimo ao salvar', async () => {
    fixture = TestBed.createComponent(FormativasActivityForm);
    fixture.componentRef.setInput('id', 'ativ-1');
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const titulo = el.querySelector('#formativa-titulo') as HTMLInputElement;
    expect(titulo.value).toBe('Minicurso Original');

    titulo.value = 'Minicurso Atualizado';
    titulo.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const form = el.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(atividadeRepo.editar).toHaveBeenCalledWith('ativ-1', {
      titulo: 'Minicurso Atualizado',
    });
  });
});
