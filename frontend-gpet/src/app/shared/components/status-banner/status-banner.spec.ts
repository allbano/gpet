import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusBanner } from './status-banner';

@Component({
  selector: 'app-host-banner-test',
  imports: [StatusBanner],
  template: `
    <app-status-banner
      [tipo]="tipo()"
      titulo="Atenção"
      mensagem="Serviço indisponível"
      [acaoTexto]="acao()"
      (acaoClicada)="cliques.update((n) => n + 1)"
    />
  `,
})
class HostBannerTest {
  readonly tipo = signal<'error' | 'success' | 'warning' | 'info'>('error');
  readonly acao = signal('Tentar novamente');
  readonly cliques = signal(0);
}

describe('StatusBanner', () => {
  let fixture: ComponentFixture<HostBannerTest>;
  let host: HostBannerTest;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostBannerTest],
    }).compileComponents();
    fixture = TestBed.createComponent(HostBannerTest);
    host = fixture.componentInstance;
  });

  it('deve usar role="alert" para erro e emitir acaoClicada ao clicar no botão', async () => {
    await fixture.whenStable();
    const banner = fixture.nativeElement.querySelector('[role]') as HTMLElement;
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.textContent).toContain('Serviço indisponível');

    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    btn.click();
    await fixture.whenStable();
    expect(host.cliques()).toBe(1);
  });

  it('deve usar role="status" para sucesso e ocultar botão se acaoTexto estiver vazio', async () => {
    host.tipo.set('success');
    host.acao.set('');
    await fixture.whenStable();

    const banner = fixture.nativeElement.querySelector('[role]') as HTMLElement;
    expect(banner.getAttribute('role')).toBe('status');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
