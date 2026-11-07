import { Component, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { form, FormField, maxLength, required } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { mensagemErro } from '../../../../shared/infrastructure/api';
import { Auth } from '../../application/auth';

@Component({
  selector: 'app-login',
  imports: [NgOptimizedImage, RouterLink, FormField],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly dados = signal({ login: '', senha: '' });
  readonly formulario = form(this.dados, (p) => {
    required(p.login);
    required(p.senha);
    maxLength(p.login, 100);
    maxLength(p.senha, 1024);
  });
  readonly erro = signal(
    this.route.snapshot.queryParamMap.get('erro') === 'conexao'
      ? 'Não foi possível verificar a sessão. Tente novamente.'
      : '',
  );
  readonly ocupado = signal(false);
  async entrar(event: Event) {
    event.preventDefault();
    if (this.formulario().invalid() || this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set('');
    try {
      const sessao = await firstValueFrom(this.auth.login(this.dados().login, this.dados().senha));
      this.dados.update((d) => ({ ...d, senha: '' }));
      await this.router.navigateByUrl(sessao.usuario.trocarSenha ? '/trocar-senha' : '/admin');
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.ocupado.set(false);
    }
  }
}
