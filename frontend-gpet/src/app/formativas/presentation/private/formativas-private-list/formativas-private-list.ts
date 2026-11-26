import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { CursorPagination } from '../../../../shared/components/cursor-pagination/cursor-pagination';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../../../shared/components/loading-skeleton/loading-skeleton';
import { MeioBadge } from '../../../../shared/components/meio-badge/meio-badge';
import { StatusBanner } from '../../../../shared/components/status-banner/status-banner';
import { FormativasPrivateManagerFacade } from '../../../application/formativas-private-manager.facade';
import { CartaoFormativo } from '../../../domain/atividade-formativa.model';

@Component({
  selector: 'app-formativas-private-list',
  imports: [
    RouterLink,
    MeioBadge,
    ConfirmDialog,
    CursorPagination,
    EmptyState,
    LoadingSkeleton,
    StatusBanner,
  ],
  templateUrl: './formativas-private-list.html',
  styleUrl: './formativas-private-list.css',
})
export class FormativasPrivateList implements OnInit {
  protected readonly facade = inject(FormativasPrivateManagerFacade);
  protected readonly atividadeParaExcluir = signal<CartaoFormativo | null>(null);
  protected readonly mensagemConfirmacaoExclusao = computed(() => {
    const titulo = this.atividadeParaExcluir()?.titulo ?? '';
    return `Tem certeza que deseja excluir "${titulo}" e todas as suas sessões?`;
  });

  ngOnInit(): void {
    void this.facade.carregarAtividades();
  }

  protected solicitarExclusao(cartao: CartaoFormativo): void {
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
