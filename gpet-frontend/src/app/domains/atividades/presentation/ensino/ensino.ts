import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { form, FormField, maxLength } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Api, mensagemErro } from '../../../../shared/infrastructure/api';
import { PageLayout } from '../../../../shared/ui/page-layout/page-layout';
import { AtividadePublica, Categoria, Catalogo } from '../../domain/atividade';

@Component({
  selector: 'app-ensino',
  imports: [PageLayout, FormField, RouterLink],
  templateUrl: './ensino.html',
  styleUrl: './ensino.css',
})
export class Ensino implements OnInit {
  private readonly api = inject(Api);
  private consulta = 0;
  readonly itens = signal<AtividadePublica[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly formatos = signal<Catalogo[]>([]);
  readonly filtros = signal({ titulo: '', natureza: '', categoriaId: '', formatoId: '' });
  readonly formulario = form(this.filtros, (p) => {
    maxLength(p.titulo, 300);
  });
  readonly categoriasVisiveis = computed(() =>
    this.categorias().filter(
      (c) => !this.filtros().natureza || c.natureza === this.filtros().natureza,
    ),
  );
  readonly pagina = signal(0);
  readonly total = signal(0);
  readonly erro = signal('');
  readonly carregando = signal(true);
  ngOnInit() {
    void this.iniciar();
  }
  async iniciar() {
    try {
      const [categorias, formatos] = await Promise.all([
        this.api.todos<Categoria>('public/categorias'),
        this.api.todos<Catalogo>('public/formatos'),
      ]);
      this.categorias.set(categorias);
      this.formatos.set(formatos);
      await this.carregar();
    } catch (e) {
      this.erro.set(mensagemErro(e));
      this.carregando.set(false);
    }
  }
  async carregar() {
    const consulta = ++this.consulta;
    this.carregando.set(true);
    this.erro.set('');
    try {
      const p = await firstValueFrom(
        this.api.listar<AtividadePublica>('public/atividades', {
          ...this.filtros(),
          pagina: this.pagina(),
        }),
      );
      if (consulta === this.consulta) {
        this.itens.set(p.itens);
        this.total.set(p.total);
      }
    } catch (e) {
      if (consulta === this.consulta) this.erro.set(mensagemErro(e));
    } finally {
      if (consulta === this.consulta) this.carregando.set(false);
    }
  }
  filtrar(event: Event) {
    event.preventDefault();
    this.pagina.set(0);
    void this.carregar();
  }
  mudarNatureza() {
    this.filtros.update((f) => ({ ...f, categoriaId: '' }));
  }
  mudarPagina(delta: number) {
    this.pagina.update((p) => p + delta);
    void this.carregar();
  }
}
