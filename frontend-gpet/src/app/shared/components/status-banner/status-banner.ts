import { Component, computed, input, output } from '@angular/core';

export type StatusBannerTipo = 'error' | 'success' | 'warning' | 'info';

@Component({
  selector: 'app-status-banner',
  templateUrl: './status-banner.html',
  styleUrl: './status-banner.css',
})
export class StatusBanner {
  readonly tipo = input<StatusBannerTipo>('info');
  readonly titulo = input<string>('');
  readonly mensagem = input.required<string>();
  readonly acaoTexto = input<string>('');

  readonly acaoClicada = output<void>();

  protected readonly roleAria = computed(() =>
    this.tipo() === 'error' || this.tipo() === 'warning' ? 'alert' : 'status',
  );

  protected readonly containerClasses = computed(() => {
    switch (this.tipo()) {
      case 'error':
        return 'border-red-300 bg-red-50 text-red-900';
      case 'success':
        return 'border-emerald-300 bg-emerald-50 text-emerald-900';
      case 'warning':
        return 'border-amber-300 bg-amber-50 text-amber-900';
      case 'info':
        return 'border-sky-300 bg-sky-50 text-sky-900';
    }
  });

  protected readonly rotuloEstado = computed(() => {
    switch (this.tipo()) {
      case 'error':
        return 'Erro';
      case 'success':
        return 'Concluído';
      case 'warning':
        return 'Aviso';
      case 'info':
        return 'Informação';
    }
  });
}
