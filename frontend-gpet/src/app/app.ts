import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NotificationToast } from './shared/components/notification-toast/notification-toast';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NotificationToast],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly menuMobileAberto = signal(false);

  protected alternarMenuMobile(): void {
    this.menuMobileAberto.update((aberto) => !aberto);
  }

  protected fecharMenuMobile(): void {
    this.menuMobileAberto.set(false);
  }
}
