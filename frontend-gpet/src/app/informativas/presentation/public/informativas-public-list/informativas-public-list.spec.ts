import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { InformativasPublicCatalogFacade } from '../../../application/informativas-public-catalog.facade';
import {
  ATIVIDADE_INFORMATIVA_REPOSITORY,
  AtividadeInformativaRepository,
} from '../../../domain/atividade-informativa-repository.port';
import { InformativasPublicList } from './informativas-public-list';

describe('InformativasPublicList', () => {
  let fixture: ComponentFixture<InformativasPublicList>;
  let repoMock: Partial<AtividadeInformativaRepository>;
  let router: Router;

  beforeEach(async () => {
    repoMock = {
      listarPublicas: vi.fn().mockResolvedValue({
        itens: [
          {
            id: '019aa000-0001-7000-8000-000000000001',
            titulo: 'Cartilha de divulgação científica',
            descricao: 'Material informativo',
            meio: 'IMPRESSO',
            classificacao_id: 'mod-1',
            classificacao: 'Cartilha',
          },
        ],
        proximo_cursor: null,
      }),
    };

    await TestBed.configureTestingModule({
      imports: [InformativasPublicList],
      providers: [
        provideRouter([]),
        InformativasPublicCatalogFacade,
        { provide: ATIVIDADE_INFORMATIVA_REPOSITORY, useValue: repoMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(InformativasPublicList);
  });

  it('deve carregar e exibir cartões públicos de atividades informativas', async () => {
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Atividades Informativas');
    expect(el.textContent).toContain('Cartilha de divulgação científica');
  });

  it('deve navegar para o detalhe ao buscar por UUID', async () => {
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = '019aa000-0001-7000-8000-000000000001';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith([
      '/public/informativas/atividades',
      '019aa000-0001-7000-8000-000000000001',
    ]);
  });
});
