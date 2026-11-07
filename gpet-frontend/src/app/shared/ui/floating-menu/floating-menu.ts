import { afterNextRender, Component, inject, Injector, input, signal } from '@angular/core';
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
  host: { '(document:keydown.escape)': 'fecharComEscape($event)' },
})
export class FloatingMenu {
  private readonly injector = inject(Injector);
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

  protected sairDoItem(event: FocusEvent): void {
    const item = event.currentTarget as HTMLElement;
    if (!(event.relatedTarget instanceof Node) || !item.contains(event.relatedTarget)) this.close();
  }

  protected abrirComTeclado(event: Event, index: number): void {
    event.preventDefault();
    const item = (event.currentTarget as HTMLElement).closest('li');
    this.open(index);
    afterNextRender(() => item?.querySelector<HTMLElement>('.submenu__link')?.focus(), {
      injector: this.injector,
    });
  }

  protected fecharComEscape(event: Event): void {
    const alvo = event.target as HTMLElement;
    const botao = alvo
      .closest?.('.floating-menu__item')
      ?.querySelector<HTMLButtonElement>('button');
    this.close();
    botao?.focus();
  }

  close(): void {
    this.openIndex.set(null);
  }
}
