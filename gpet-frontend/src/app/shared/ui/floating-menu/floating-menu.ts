import { Component, input, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuItem } from '../../navigation/domain/menu-item.model';
import { Submenu } from '../submenu/submenu';

/**
 * Menu flutuante com bordas arredondadas.
 * Recebe os itens via input para ser reutilizável em qualquer tela.
 */
@Component({
  selector: 'app-floating-menu',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, Submenu],
  templateUrl: './floating-menu.html',
  styleUrl: './floating-menu.css',
  host: { '(document:keydown.escape)': 'close()' },
})
export class FloatingMenu {
  readonly items = input.required<readonly MenuItem[]>();
  readonly iconSrc = input('images/gpet-icon-64.png');
  readonly brandLabel = input('GPET - página inicial');

  protected readonly openIndex = signal<number | null>(null);
  protected readonly mobileOpen = signal(false);

  protected open(index: number): void {
    this.openIndex.set(index);
  }

  protected toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? null : index));
  }

  protected toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }

  close(): void {
    this.openIndex.set(null);
  }
}

