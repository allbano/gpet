import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('deve criar a aplicação', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve exibir marca GPET e links separados para Formativas e Informativas', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('GPET · UFPR');
    expect(compiled.textContent).toContain('Formativas (Público)');
    expect(compiled.textContent).toContain('Formativas (Privado)');
    expect(compiled.textContent).toContain('Informativas (Público)');
    expect(compiled.textContent).toContain('Informativas (Privado)');
  });
});
