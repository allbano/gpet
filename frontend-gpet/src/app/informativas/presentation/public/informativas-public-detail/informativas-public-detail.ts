import { Component, OnDestroy, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatarIntervaloPeriodo } from '../../../../core/time/timezone-datetime.util';
import { LoadingSkeleton } from '../../../../shared/components/loading-skeleton/loading-skeleton';
import { MeioBadge } from '../../../../shared/components/meio-badge/meio-badge';
import { StatusBanner } from '../../../../shared/components/status-banner/status-banner';
import { CargaHorariaPipe } from '../../../../shared/pipes/carga-horaria.pipe';
import { InformativasPublicCatalogFacade } from '../../../application/informativas-public-catalog.facade';

@Component({
  selector: 'app-informativas-public-detail',
  imports: [RouterLink, MeioBadge, CargaHorariaPipe, LoadingSkeleton, StatusBanner],
  templateUrl: './informativas-public-detail.html',
  styleUrl: './informativas-public-detail.css',
})
export class InformativasPublicDetail implements OnDestroy {
  readonly id = input.required<string>();
  protected readonly facade = inject(InformativasPublicCatalogFacade);

  protected readonly periodosFormatados = computed(() => {
    const detalhe = this.facade.detalhe();
    if (!detalhe) {
      return [];
    }
    return detalhe.periodos.map((periodo) => ({
      id: periodo.id,
      ...formatarIntervaloPeriodo(periodo.inicio, periodo.termino, periodo.fuso),
    }));
  });

  constructor() {
    effect(() => {
      const atividadeId = this.id();
      if (atividadeId) {
        void this.facade.carregarDetalhe(atividadeId);
      }
    });
  }

  ngOnDestroy(): void {
    this.facade.limparDetalhe();
  }
}
