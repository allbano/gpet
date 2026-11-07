import { Component, inject, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Api, mensagemErro } from '../../../../shared/infrastructure/api';
import {
  Atividade,
  AtividadeEditavel,
  Catalogo,
  Categoria,
  dadosAtividade,
} from '../../domain/atividade';
import { AtividadeForm } from '../atividade-form/atividade-form';

@Component({
  selector: 'app-admin-atividades',
  imports: [AtividadeForm],
  templateUrl: './admin-atividades.html',
  styleUrl: './admin-atividades.css',
})
export class AdminAtividades implements OnInit {
  private readonly api = inject(Api);
  readonly itens = signal<Atividade[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly formatos = signal<Catalogo[]>([]);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly carregando = signal(true);
  readonly ocupado = signal(false);
  readonly editar = signal(false);
  readonly atual = signal<Atividade | null>(null);
  readonly excluirPendente = signal<Atividade | null>(null);
  readonly pagina = signal(0);
  readonly total = signal(0);
  ngOnInit() {
    void this.carregar();
  }
  async carregar() {
    this.carregando.set(true);
    this.erro.set('');
    try {
      const [p, categorias, formatos] = await Promise.all([
        firstValueFrom(this.api.listar<Atividade>('admin/atividades', { pagina: this.pagina() })),
        this.api.todos<Categoria>('admin/categorias'),
        this.api.todos<Catalogo>('admin/formatos'),
      ]);
      this.itens.set(p.itens);
      this.total.set(p.total);
      this.categorias.set(categorias);
      this.formatos.set(formatos);
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.carregando.set(false);
    }
  }
  abrir(item: Atividade | null) {
    this.atual.set(item);
    this.editar.set(true);
    this.aviso.set('');
    this.erro.set('');
  }
  async salvar(dados: AtividadeEditavel) {
    this.ocupado.set(true);
    this.erro.set('');
    try {
      const atual = this.atual();
      await firstValueFrom(
        atual
          ? this.api.editar('admin/atividades', atual.id, dadosAtividade(dados))
          : this.api.criar('admin/atividades', dadosAtividade(dados)),
      );
      this.editar.set(false);
      this.aviso.set('Atividade salva e disponível na área pública.');
      await this.carregar();
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.ocupado.set(false);
    }
  }
  async excluir() {
    const item = this.excluirPendente();
    if (!item || this.ocupado()) return;
    this.ocupado.set(true);
    try {
      await firstValueFrom(this.api.excluir('admin/atividades', item.id, item.versao));
      this.excluirPendente.set(null);
      this.aviso.set('Atividade excluída.');
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
