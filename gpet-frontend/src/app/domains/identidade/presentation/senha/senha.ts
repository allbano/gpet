import { Component, inject, signal } from '@angular/core';
import { form, FormField, maxLength, minLength, required } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageLayout } from '../../../../shared/ui/page-layout/page-layout';
import { mensagemErro } from '../../../../shared/infrastructure/api';
import { SENHA_MINIMA, SENHA_MAXIMA } from '../../domain/politica-senha';
import { Auth } from '../../application/auth';

@Component({
  selector: 'app-senha',
  imports: [PageLayout, FormField],
  templateUrl: './senha.html',
  styleUrl: './senha.css',
})
export class Senha {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  readonly dados = signal({ atual: '', nova: '', confirmacao: '' });
  readonly formulario = form(this.dados, (p) => {
    required(p.atual);
    required(p.nova);
    minLength(p.nova, SENHA_MINIMA);
    required(p.confirmacao);
    maxLength(p.atual, 1024);
    maxLength(p.nova, SENHA_MAXIMA);
    maxLength(p.confirmacao, SENHA_MAXIMA);
  });
  readonly erro = signal('');
  readonly ocupado = signal(false);
  async salvar(event: Event) {
    event.preventDefault();
    if (this.formulario().invalid() || this.ocupado()) return;
    if (this.dados().nova !== this.dados().confirmacao) {
      this.erro.set('A confirmação deve ser igual à nova senha.');
      return;
    }
    this.ocupado.set(true);
    this.erro.set('');
    try {
      await firstValueFrom(this.auth.trocarSenha(this.dados().atual, this.dados().nova));
      this.dados.set({ atual: '', nova: '', confirmacao: '' });
      await this.router.navigateByUrl('/gpet-admin/login');
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.ocupado.set(false);
    }
  }
}
