import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom, tap } from 'rxjs';
import { Sessao } from '../domain/identidade';
import { SessaoStore } from './sessao-store';

@Service()
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly store = inject(SessaoStore);
  readonly sessao = this.store.sessao.asReadonly();
  login(login: string, senha: string) {
    return this.http
      .post<Sessao>('/api/v1/auth/login', { login, senha })
      .pipe(tap((sessao) => this.store.sessao.set(sessao)));
  }
  async carregar(): Promise<Sessao | null> {
    try {
      const sessao = await firstValueFrom(this.http.get<Sessao>('/api/v1/auth/sessao'));
      this.store.sessao.set(sessao);
      return sessao;
    } catch (erro) {
      this.store.sessao.set(null);
      if (erro instanceof HttpErrorResponse && erro.status === 401) return null;
      throw erro;
    }
  }
  logout() {
    return this.http
      .post<void>('/api/v1/auth/logout', {})
      .pipe(tap(() => this.store.sessao.set(null)));
  }
  trocarSenha(senhaAtual: string, novaSenha: string) {
    return this.http
      .put<void>('/api/v1/auth/senha', { senhaAtual, novaSenha })
      .pipe(tap(() => this.store.sessao.set(null)));
  }
}
