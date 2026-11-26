import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FormativasPrivateShell } from './formativas-private-shell';

describe('FormativasPrivateShell', () => {
  let fixture: ComponentFixture<FormativasPrivateShell>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormativasPrivateShell],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(FormativasPrivateShell);
  });

  it('deve renderizar links de navegação para Atividades, Tipos de Atividade e Agenda', async () => {
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Gestão de Atividades Formativas');
    expect(el.textContent).toContain('Atividades');
    expect(el.textContent).toContain('Tipos de Atividade');
    expect(el.textContent).toContain('Agenda');
  });
});
