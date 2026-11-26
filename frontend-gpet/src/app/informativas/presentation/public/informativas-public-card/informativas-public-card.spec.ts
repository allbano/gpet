import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CartaoInformativo } from '../../../domain/atividade-informativa.model';
import { InformativasPublicCard } from './informativas-public-card';

describe('InformativasPublicCard', () => {
  let fixture: ComponentFixture<InformativasPublicCard>;

  const cartao: CartaoInformativo = {
    id: '019aa000-0001-7000-8000-000000000001',
    titulo: 'Cartilha de divulgação científica',
    descricao: 'Introdução aos métodos e práticas do grupo.',
    meio: 'IMPRESSO',
    classificacao_id: '019aa000-0000-7000-8000-000000000001',
    classificacao: 'Cartilha',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InformativasPublicCard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(InformativasPublicCard);
    fixture.componentRef.setInput('cartao', cartao);
  });

  it('deve exibir título, modalidade, meio e link público para a atividade informativa', async () => {
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Cartilha de divulgação científica');
    expect(el.textContent).toContain('Cartilha');
    expect(el.textContent).toContain('Impresso');

    const link = el.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toContain(
      '/public/informativas/atividades/019aa000-0001-7000-8000-000000000001',
    );
  });
});
