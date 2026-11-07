import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Auth } from '../../../domains/identidade/application/auth';
import { mensagemErro } from '../../infrastructure/api';
import { PageLayout } from '../page-layout/page-layout';

@Component({
  selector: 'app-admin-layout',
  imports: [PageLayout, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  readonly erro = signal('');
  async sair() {
    try {
      await firstValueFrom(this.auth.logout());
      await this.router.navigateByUrl('/gpet-admin/login');
    } catch (e) {
      this.erro.set(mensagemErro(e));
    }
  }
}
