import { Injectable, signal } from '@angular/core';
import { MenuItem } from '../domain/menu-item.model';
import { MAIN_MENU } from '../infrastructure/main-menu.data';

/** Caso de uso: fornecer os itens de navegação principal da aplicação. */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  readonly mainMenu = signal<readonly MenuItem[]>(MAIN_MENU).asReadonly();
}

