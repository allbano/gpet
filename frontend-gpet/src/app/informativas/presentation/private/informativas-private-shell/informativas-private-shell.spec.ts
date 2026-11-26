import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { InformativasPrivateShell } from './informativas-private-shell';

describe('InformativasPrivateShell', () => {
  let fixture: ComponentFixture<InformativasPrivateShell>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InformativasPrivateShell],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(InformativasPrivateShell);
  });

  it('deve exibir navegação para Atividades, Modalidades e Agenda', async () => {
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Gestão de Atividades Informativas');
    expect(el.textContent).toContain('Atividades');
    expect(el.textContent).toContain('Modalidades');
    expect(el.textContent).toContain('Agenda');
  });
});
