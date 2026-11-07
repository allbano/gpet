import { Component, inject, OnInit, signal } from '@angular/core';
import { form, FormField, maxLength, required } from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Api, mensagemErro } from '../../../../shared/infrastructure/api';
import { Catalogo, Natureza } from '../../domain/atividade';

interface ItemCatalogo extends Catalogo {
  natureza?: Natureza;
}
const vazio = () => ({
  nome: '',
  descricao: '',
  natureza: 'informativa' as Natureza,
  ativo: true,
  versao: 0,
});
@Component({
  selector: 'app-catalogos',
  imports: [FormField],
  templateUrl: './catalogos.html',
  styleUrl: './catalogos.css',
})
export class Catalogos implements OnInit {
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);
  readonly categoria = this.route.snapshot.data['recurso'] === 'categorias';
  readonly titulo = this.categoria ? 'Categorias' : 'Formatos';
  readonly recurso = this.categoria ? 'admin/categorias' : 'admin/formatos';
  readonly itens = signal<ItemCatalogo[]>([]);
  readonly dados = signal(vazio());
  readonly formulario = form(this.dados, (p) => {
    required(p.nome);
    required(p.descricao);
    maxLength(p.nome, 200);
    maxLength(p.descricao, 10000);
  });
  readonly atual = signal<ItemCatalogo | null>(null);
  readonly aberto = signal(false);
  readonly excluirPendente = signal<ItemCatalogo | null>(null);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly carregando = signal(true);
  readonly ocupado = signal(false);
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
        this.api.listar<ItemCatalogo>(this.recurso, { pagina: this.pagina() }),
      );
      this.itens.set(p.itens);
      this.total.set(p.total);
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.carregando.set(false);
    }
  }
  abrir(item: ItemCatalogo | null) {
    this.atual.set(item);
    this.dados.set(item ? { ...item, natureza: item.natureza ?? 'informativa' } : vazio());
    this.aberto.set(true);
    this.erro.set('');
    this.aviso.set('');
  }
  async salvar(event: Event) {
    event.preventDefault();
    if (this.formulario().invalid() || this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set('');
    const { natureza, ...comum } = this.dados();
    const dados = this.categoria ? { ...comum, natureza } : comum;
    try {
      const atual = this.atual();
      await firstValueFrom(
        atual
          ? this.api.editar(this.recurso, atual.id, dados)
          : this.api.criar(this.recurso, dados),
      );
      this.aberto.set(false);
      this.aviso.set('Cadastro salvo.');
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
      await firstValueFrom(this.api.excluir(this.recurso, item.id, item.versao));
      this.excluirPendente.set(null);
      this.aviso.set('Cadastro excluído ou desativado por possuir referências.');
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
