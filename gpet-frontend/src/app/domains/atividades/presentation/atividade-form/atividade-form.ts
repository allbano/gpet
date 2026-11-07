import { Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { form, FormField, maxLength, required } from '@angular/forms/signals';
import {
  Atividade,
  AtividadeEditavel,
  Catalogo,
  Categoria,
  atividadeVazia,
  categoriasDisponiveis,
  errosAtividade,
} from '../../domain/atividade';

@Component({
  selector: 'app-atividade-form',
  imports: [FormField],
  templateUrl: './atividade-form.html',
  styleUrl: './atividade-form.css',
})
export class AtividadeForm {
  readonly inicial = input<Atividade | null>(null);
  readonly categorias = input.required<Categoria[]>();
  readonly formatos = input.required<Catalogo[]>();
  readonly ocupado = input(false);
  readonly salvar = output<AtividadeEditavel>();
  readonly cancelar = output<void>();
  readonly dados = linkedSignal(() => {
    const a = this.inicial();
    return a
      ? { ...a, objetivo: a.objetivo ?? '', descricao: a.descricao ?? '' }
      : atividadeVazia();
  });
  readonly formulario = form(this.dados, (p) => {
    required(p.titulo);
    required(p.categoriaId);
    required(p.formatoId);
    required(p.cargaHoraria);
    required(p.inicio);
    required(p.fim);
    required(p.publicoAlvo);
    maxLength(p.titulo, 300);
    maxLength(p.cargaHoraria, 500);
    maxLength(p.publicoAlvo, 1000);
    maxLength(p.objetivo, 10000);
    maxLength(p.descricao, 10000);
  });
  readonly categoriasVisiveis = computed(() =>
    categoriasDisponiveis(
      this.categorias(),
      this.dados().natureza,
      this.inicial()?.categoriaId ?? '',
    ),
  );
  readonly formatosVisiveis = computed(() =>
    this.formatos().filter((f) => f.ativo || f.id === this.inicial()?.formatoId),
  );
  readonly erros = signal<string[]>([]);
  mudarNatureza() {
    this.dados.update((a) => ({ ...a, categoriaId: '' }));
  }
  enviar(event: Event) {
    event.preventDefault();
    if (this.ocupado()) return;
    const erros = errosAtividade(this.dados());
    if (!this.categoriasVisiveis().some((c) => c.id === this.dados().categoriaId))
      erros.push('Selecione uma categoria da natureza escolhida.');
    this.erros.set(erros);
    if (!erros.length) this.salvar.emit(this.dados());
  }
}
