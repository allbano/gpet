import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MeioBadge, MeioAtividade } from './meio-badge';

@Component({
  selector: 'app-host-meio-test',
  imports: [MeioBadge],
  template: `<app-meio-badge [meio]="meio()" />`,
})
class HostMeioTest {
  readonly meio = signal<MeioAtividade>('HIBRIDO');
}

describe('MeioBadge', () => {
  let fixture: ComponentFixture<HostMeioTest>;
  let host: HostMeioTest;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostMeioTest],
    }).compileComponents();
    fixture = TestBed.createComponent(HostMeioTest);
    host = fixture.componentInstance;
  });

  it('deve traduzir todos os meios de realização para rótulos legíveis em português', async () => {
    const casos: Array<[MeioAtividade, string]> = [
      ['ONLINE', 'Online'],
      ['PRESENCIAL', 'Presencial'],
      ['HIBRIDO', 'Híbrido'],
      ['IMPRESSO', 'Impresso'],
    ];

    for (const [valor, esperado] of casos) {
      host.meio.set(valor);
      await fixture.whenStable();
      expect(fixture.nativeElement.textContent).toContain(esperado);
    }
  });
});
