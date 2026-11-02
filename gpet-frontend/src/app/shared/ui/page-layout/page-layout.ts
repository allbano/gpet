import { Component, inject } from '@angular/core';
import { NavigationService } from '../../navigation/application/navigation.service';
import { FloatingMenu } from '../floating-menu/floating-menu';
import { Footer } from '../footer/footer';

/**
 * Layout padrão: menu flutuante + conteúdo projetado + rodapé.
 * Qualquer tela pode reutilizá-lo envolvendo seu conteúdo em <app-page-layout>.
 */
@Component({
  selector: 'app-page-layout',
  imports: [FloatingMenu, Footer],
  templateUrl: './page-layout.html',
  styleUrl: './page-layout.css',
})
export class PageLayout {
  protected readonly menu = inject(NavigationService).mainMenu;
}

