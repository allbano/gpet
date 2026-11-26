import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { CursorPagination } from '../../../../shared/components/cursor-pagination/cursor-pagination';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../../../shared/components/loading-skeleton/loading-skeleton';
import { MeioBadge } from '../../../../shared/components/meio-badge/meio-badge';
import { StatusBanner } from '../../../../shared/components/status-banner/status-banner';
import { InformativasPrivateManagerFacade } from '../../../application/informativas-private-manager.facade';
import { CartaoInformativo } from '../../../domain/atividade-informativa.model';

@Component({
  selector: 'app-informativas-private-list',
  imports: [
    RouterLink,
    MeioBadge,
    ConfirmDialog,
    CursorPagination,
    EmptyState,
    LoadingSkeleton,
    StatusBanner,
  ],
  templateUrl: './informativas-private-list.html',
  styleUrl: './informativas-private-list.css',
})
export class InformativasPrivateList implements OnInit {
  protected readonly facade = inject(InformativasPrivateManagerFacade);
  protected readonly atividadeParaExcluir = signal<CartaoInformativo | null>(null);
  protected readonly mensagemConfirmacaoExclusao = computed(() => {
    const titulo = this.atividadeParaExcluir()?.titulo ?? '';
    return `Tem certeza que deseja excluir "${titulo}" e todos os seus períodos?`;
  });

  ngOnInit(): void {
    void this.facade.carregarAtividades();
  }

  protected solicitarExclusao(cartao: CartaoInformativo): void {
    this.atividadeParaExcluir.set(cartao);
  }

  protected cancelarExclusao(): void {
    this.atividadeParaExcluir.set(null);
  }

  protected async confirmarExclusao(): Promise<void> {
    const alvo = this.atividadeParaExcluir();
    if (!alvo) {
      return;
    }
    await this.facade.excluirAtividade(alvo.id);
    this.atividadeParaExcluir.set(null);
  }
}
