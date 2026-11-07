import { Component, inject, OnInit, signal } from '@angular/core';
import { form, FormField, minLength, maxLength, required } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { Api, mensagemErro } from '../../../../shared/infrastructure/api';
import { SENHA_MINIMA, SENHA_MAXIMA } from '../../domain/politica-senha';
import { Usuario } from '../../domain/identidade';

const vazio = () => ({ nome: '', login: '', senhaTemporaria: '', ativo: true, versao: 0 });
@Component({
  selector: 'app-usuarios',
  imports: [FormField],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios implements OnInit {
  private readonly api = inject(Api);
  readonly itens = signal<Usuario[]>([]);
  readonly dados = signal(vazio());
  readonly formulario = form(this.dados, (p) => {
    required(p.nome);
    required(p.login);
    maxLength(p.nome, 200);
    minLength(p.login, 3);
    maxLength(p.login, 100);
    minLength(p.senhaTemporaria, SENHA_MINIMA);
    maxLength(p.senhaTemporaria, SENHA_MAXIMA);
  });
  readonly senha = signal({ senhaTemporaria: '' });
  readonly formularioSenha = form(this.senha, (p) => {
    required(p.senhaTemporaria);
    minLength(p.senhaTemporaria, SENHA_MINIMA);
    maxLength(p.senhaTemporaria, SENHA_MAXIMA);
  });
  readonly atual = signal<Usuario | null>(null);
  readonly redefinir = signal<Usuario | null>(null);
  readonly desativarPendente = signal<Usuario | null>(null);
  readonly aberto = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly ocupado = signal(false);
  readonly carregando = signal(true);
  readonly pagina = signal(0);
  readonly total = signal(0);
  ngOnInit() {
    void this.carregar();
  }
  async carregar() {
    this.carregando.set(true);
    this.erro.set('');
    try {
      const p = await firstValueFrom(
        this.api.listar<Usuario>('admin/usuarios', { pagina: this.pagina() }),
      );
      this.itens.set(p.itens);
      this.total.set(p.total);
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.carregando.set(false);
    }
  }
  abrir(usuario: Usuario | null) {
    this.atual.set(usuario);
    this.dados.set(usuario ? { ...usuario, senhaTemporaria: '' } : vazio());
    this.aberto.set(true);
    this.erro.set('');
    this.aviso.set('');
  }
  async salvar(event: Event) {
    event.preventDefault();
    if (this.formulario().invalid() || this.ocupado()) return;
    const dados = this.dados();
    const atual = this.atual();
    if (!atual && dados.senhaTemporaria.length < SENHA_MINIMA) {
      this.erro.set('A senha temporária deve ter de 8 a 64 caracteres.');
      return;
    }
    this.ocupado.set(true);
    this.erro.set('');
    try {
      await firstValueFrom(
        atual
          ? this.api.editar('admin/usuarios', atual.id, {
              nome: dados.nome,
              login: dados.login,
              ativo: dados.ativo,
              versao: dados.versao,
            })
          : this.api.criar('admin/usuarios', {
              nome: dados.nome,
              login: dados.login,
              senhaTemporaria: dados.senhaTemporaria,
            }),
      );
      this.aberto.set(false);
      this.dados.set(vazio());
      this.aviso.set('Usuário salvo. Novos usuários devem trocar a senha no primeiro acesso.');
      await this.carregar();
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.ocupado.set(false);
    }
  }
  async desativar() {
    const u = this.desativarPendente();
    if (!u || this.ocupado()) return;
    this.ocupado.set(true);
    try {
      await firstValueFrom(this.api.excluir('admin/usuarios', u.id, u.versao));
      this.desativarPendente.set(null);
      this.aviso.set('Usuário desativado e sessões revogadas.');
      await this.carregar();
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.ocupado.set(false);
    }
  }
  abrirSenha(u: Usuario) {
    this.redefinir.set(u);
    this.senha.set({ senhaTemporaria: '' });
  }
  async redefinirSenha(event: Event) {
    event.preventDefault();
    const u = this.redefinir();
    if (!u || this.ocupado()) return;
    if (this.formularioSenha().invalid()) {
      this.erro.set('A senha temporária deve ter de 8 a 64 caracteres.');
      return;
    }
    this.ocupado.set(true);
    try {
      await firstValueFrom(
        this.api.editar('admin/usuarios', u.id, { ...this.senha(), versao: u.versao }, 'senha'),
      );
      this.redefinir.set(null);
      this.senha.set({ senhaTemporaria: '' });
      this.aviso.set('Senha redefinida e sessões revogadas.');
      await this.carregar();
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.ocupado.set(false);
    }
  }
  mudarPagina(delta: number) {
    this.pagina.update((p) => p + delta);
    void this.carregar();
  }
}
