import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton',
  templateUrl: './loading-skeleton.html',
  styleUrl: './loading-skeleton.css',
})
export class LoadingSkeleton {
  readonly linhas = input<number>(3);
  readonly rotulo = input<string>('Carregando dados...');

  protected readonly itens = computed(() =>
    Array.from({ length: Math.max(1, this.linhas()) }, (_, index) => index),
  );
}
