import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CartaoFormativo } from '../../../domain/atividade-formativa.model';
import { FormativasPublicCard } from './formativas-public-card';

describe('FormativasPublicCard', () => {
  let fixture: ComponentFixture<FormativasPublicCard>;

  const cartao: CartaoFormativo = {
    id: '019aa000-0001-7000-8000-000000000001',
    titulo: 'Minicurso de pesquisa em três dias',
    descricao: 'Introdução aos métodos e práticas do grupo.',
    meio: 'HIBRIDO',
    classificacao_id: '019aa000-0000-7000-8000-000000000001',
    classificacao: 'Minicurso',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormativasPublicCard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FormativasPublicCard);
    fixture.componentRef.setInput('cartao', cartao);
  });

  it('deve exibir título, descrição, classificação, meio e link para o detalhe público', async () => {
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Minicurso de pesquisa em três dias');
    expect(el.textContent).toContain('Introdução aos métodos e práticas do grupo.');
    expect(el.textContent).toContain('Minicurso');
    expect(el.textContent).toContain('Híbrido');

    const link = el.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toContain(
      '/public/formativas/atividades/019aa000-0001-7000-8000-000000000001',
    );
  });
});
