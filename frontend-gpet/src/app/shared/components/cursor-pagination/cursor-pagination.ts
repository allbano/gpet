import { Component, input, output } from '@angular/core';

let proximoPaginationId = 0;

@Component({
  selector: 'app-cursor-pagination',
  templateUrl: './cursor-pagination.html',
  styleUrl: './cursor-pagination.css',
})
export class CursorPagination {
  readonly totalCarregado = input.required<number>();
  readonly possuiMais = input.required<boolean>();
  readonly carregando = input<boolean>(false);
  readonly limiteAtual = input<number>(20);
  readonly opcoesLimite = input<readonly number[]>([12, 20, 50]);

  readonly carregarMais = output<void>();
  readonly limiteAlterado = output<number>();

  protected readonly selectId = `cursor-limit-${++proximoPaginationId}`;

  protected aoAlterarLimite(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const parsed = Number(select.value);
    if (!Number.isNaN(parsed) && parsed > 0) {
      this.limiteAlterado.emit(parsed);
    }
  }
}
