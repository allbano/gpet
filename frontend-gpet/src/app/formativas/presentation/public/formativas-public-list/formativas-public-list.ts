import { Component, OnInit, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { CursorPagination } from '../../../../shared/components/cursor-pagination/cursor-pagination';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../../../shared/components/loading-skeleton/loading-skeleton';
import { StatusBanner } from '../../../../shared/components/status-banner/status-banner';
import { FormativasPublicCatalogFacade } from '../../../application/formativas-public-catalog.facade';
import { FormativasPublicCard } from '../formativas-public-card/formativas-public-card';

@Component({
  selector: 'app-formativas-public-list',
  imports: [
    RouterLink,
    FormField,
    FormativasPublicCard,
    CursorPagination,
    EmptyState,
    LoadingSkeleton,
    StatusBanner,
  ],
  templateUrl: './formativas-public-list.html',
  styleUrl: './formativas-public-list.css',
})
export class FormativasPublicList implements OnInit {
  protected readonly facade = inject(FormativasPublicCatalogFacade);
  private readonly router = inject(Router);

  protected readonly buscaModelo = signal({ atividadeId: '' });
  protected readonly buscaForm = form(this.buscaModelo, (s) => {
    required(s.atividadeId, { message: 'Informe o UUID da atividade formativa.' });
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
      await this.router.navigate(['/public/formativas/atividades', id]);
    });
  }
}
