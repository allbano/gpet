import { Component, OnInit, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { CursorPagination } from '../../../../shared/components/cursor-pagination/cursor-pagination';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../../../shared/components/loading-skeleton/loading-skeleton';
import { StatusBanner } from '../../../../shared/components/status-banner/status-banner';
import { InformativasPublicCatalogFacade } from '../../../application/informativas-public-catalog.facade';
import { InformativasPublicCard } from '../informativas-public-card/informativas-public-card';

@Component({
  selector: 'app-informativas-public-list',
  imports: [
    RouterLink,
    FormField,
    InformativasPublicCard,
    CursorPagination,
    EmptyState,
    LoadingSkeleton,
    StatusBanner,
  ],
  templateUrl: './informativas-public-list.html',
  styleUrl: './informativas-public-list.css',
})
export class InformativasPublicList implements OnInit {
  protected readonly facade = inject(InformativasPublicCatalogFacade);
  private readonly router = inject(Router);

  protected readonly buscaModelo = signal({ atividadeId: '' });
  protected readonly buscaForm = form(this.buscaModelo, (s) => {
    required(s.atividadeId, { message: 'Informe o UUID da atividade informativa.' });
  });

  ngOnInit(): void {
    void this.facade.carregarPrimeiraPagina();
  }

  protected abrirPorUuid(): void {
    submit(this.buscaForm, async () => {
      const id = this.buscaModelo().atividadeId.trim();
      if (!id) {
        return;
      }
      await this.router.navigate(['/public/informativas/atividades', id]);
    });
  }
}
