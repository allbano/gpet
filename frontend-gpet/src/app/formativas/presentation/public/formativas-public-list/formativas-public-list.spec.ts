import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { FormativasPublicCatalogFacade } from '../../../application/formativas-public-catalog.facade';
import {
  ATIVIDADE_FORMATIVA_REPOSITORY,
  AtividadeFormativaRepository,
} from '../../../domain/atividade-formativa-repository.port';
import { FormativasPublicList } from './formativas-public-list';

describe('FormativasPublicList', () => {
  let fixture: ComponentFixture<FormativasPublicList>;
  let repoMock: Partial<AtividadeFormativaRepository>;
  let router: Router;

  beforeEach(async () => {
    repoMock = {
      listarPublicas: vi.fn().mockResolvedValue({
        itens: [
          {
            id: '019aa000-0001-7000-8000-000000000001',
            titulo: 'Minicurso de pesquisa',
            descricao: 'Resumo da atividade',
            meio: 'HIBRIDO',
            classificacao_id: 'tipo-1',
            classificacao: 'Minicurso',
          },
        ],
        proximo_cursor: 'cursor-1',
      }),
    };

    await TestBed.configureTestingModule({
      imports: [FormativasPublicList],
      providers: [
        provideRouter([]),
        FormativasPublicCatalogFacade,
        { provide: ATIVIDADE_FORMATIVA_REPOSITORY, useValue: repoMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(FormativasPublicList);
  });

  it('deve carregar e renderizar os cartões públicos de atividades formativas', async () => {
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Atividades Formativas');
    expect(el.textContent).toContain('Minicurso de pesquisa');
    expect(repoMock.listarPublicas).toHaveBeenCalledTimes(1);
  });

  it('deve navegar diretamente para o detalhe da atividade ao informar o UUID', async () => {
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = '019aa000-0001-7000-8000-000000000001';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith([
      '/public/formativas/atividades',
      '019aa000-0001-7000-8000-000000000001',
    ]);
  });
});
