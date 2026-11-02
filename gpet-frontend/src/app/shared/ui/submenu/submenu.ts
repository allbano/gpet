import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuItem } from '../../navigation/domain/menu-item.model';

/** Lista suspensa de subitens. Reutilizável por qualquer menu. */
@Component({
  selector: 'app-submenu',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './submenu.html',
  styleUrl: './submenu.css',
})
export class Submenu {
  readonly items = input.required<readonly MenuItem[]>();
  readonly open = input(false);
  readonly submenuId = input.required<string>();
}

