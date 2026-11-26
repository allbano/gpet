import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CursorPagination } from './cursor-pagination';

@Component({
  selector: 'app-host-pagination-test',
  imports: [CursorPagination],
  template: `
    <app-cursor-pagination
      [totalCarregado]="total()"
      [possuiMais]="possuiMais()"
      [carregando]="carregando()"
      [limiteAtual]="limite()"
      (carregarMais)="maisCliques.update((n) => n + 1)"
      (limiteAlterado)="limiteSelecionado.set($event)"
    />
  `,
})
class HostPaginationTest {
  readonly total = signal(20);
  readonly possuiMais = signal(true);
  readonly carregando = signal(false);
  readonly limite = signal(20);
  readonly maisCliques = signal(0);
  readonly limiteSelecionado = signal<number | null>(null);
}

describe('CursorPagination', () => {
  let fixture: ComponentFixture<HostPaginationTest>;
  let host: HostPaginationTest;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostPaginationTest],
    }).compileComponents();
    fixture = TestBed.createComponent(HostPaginationTest);
    host = fixture.componentInstance;
  });

  it('deve emitir carregarMais ao clicar no botão quando possuiMais=true', async () => {
    await fixture.whenStable();
    const btn = fixture.nativeElement.querySelector('button[data-action="load-more"]') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    await fixture.whenStable();
    expect(host.maisCliques()).toBe(1);
  });

  it('deve emitir limiteAlterado ao mudar o seletor de itens por página', async () => {
    await fixture.whenStable();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = '50';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(host.limiteSelecionado()).toBe(50);
  });

  it('deve ocultar botão de carregar mais quando possuiMais=false', async () => {
    host.possuiMais.set(false);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button[data-action="load-more"]')).toBeNull();
  });
});
