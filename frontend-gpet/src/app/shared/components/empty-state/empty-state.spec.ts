import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyState } from './empty-state';

@Component({
  selector: 'app-host-empty-test',
  imports: [EmptyState],
  template: `
    <app-empty-state titulo="Nenhuma atividade" descricao="Cadastre a primeira atividade.">
      <button type="button">Criar agora</button>
    </app-empty-state>
  `,
})
class HostEmptyTest {}

describe('EmptyState', () => {
  let fixture: ComponentFixture<HostEmptyTest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostEmptyTest],
    }).compileComponents();
    fixture = TestBed.createComponent(HostEmptyTest);
  });

  it('deve exibir título, descrição e conteúdo projetado', async () => {
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Nenhuma atividade');
    expect(el.textContent).toContain('Cadastre a primeira atividade.');
    expect(el.querySelector('button')?.textContent).toContain('Criar agora');
  });
});
