import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingSkeleton } from './loading-skeleton';

@Component({
  selector: 'app-host-skeleton-test',
  imports: [LoadingSkeleton],
  template: `<app-loading-skeleton [linhas]="linhas()" rotulo="Carregando atividades..." />`,
})
class HostSkeletonTest {
  readonly linhas = signal(4);
}

describe('LoadingSkeleton', () => {
  let fixture: ComponentFixture<HostSkeletonTest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostSkeletonTest],
    }).compileComponents();
    fixture = TestBed.createComponent(HostSkeletonTest);
  });

  it('deve renderizar a quantidade solicitada de placeholders com status acessível', async () => {
    await fixture.whenStable();
    const container = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(container.getAttribute('aria-busy')).toBe('true');
    expect(container.textContent).toContain('Carregando atividades...');
    const itens = fixture.nativeElement.querySelectorAll('[data-skeleton-item]');
    expect(itens.length).toBe(4);
  });
});
