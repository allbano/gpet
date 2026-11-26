import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../../../shared/components/loading-skeleton/loading-skeleton';
import { StatusBanner } from '../../../../shared/components/status-banner/status-banner';
import { FormativasPrivateManagerFacade } from '../../../application/formativas-private-manager.facade';
import { TipoAtividade } from '../../../domain/tipo-atividade.model';

@Component({
  selector: 'app-formativas-tipos-manager',
  imports: [FormField, ConfirmDialog, EmptyState, LoadingSkeleton, StatusBanner],
  templateUrl: './formativas-tipos-manager.html',
  styleUrl: './formativas-tipos-manager.css',
})
export class FormativasTiposManager implements OnInit {
  protected readonly facade = inject(FormativasPrivateManagerFacade);

  protected readonly novoModelo = signal({ nome: '' });
  protected readonly novoForm = form(this.novoModelo, (s) => {
    required(s.nome, { message: 'Preencha o nome do tipo de atividade.' });
    validate(s.nome, ({ value }) =>
      value().trim() ? undefined : { kind: 'blank', message: 'Preencha o nome do tipo de atividade.' },
    );
  });

  protected readonly editandoId = signal<string | null>(null);
  protected readonly edicaoModelo = signal({ nome: '' });
  protected readonly edicaoForm = form(this.edicaoModelo, (s) => {
    required(s.nome, { message: 'Informe o novo nome.' });
    validate(s.nome, ({ value }) =>
      value().trim() ? undefined : { kind: 'blank', message: 'Informe o novo nome.' },
    );
  });

  protected readonly tipoParaExcluir = signal<TipoAtividade | null>(null);
  protected readonly mensagemConfirmacaoExclusao = computed(() => {
    const nome = this.tipoParaExcluir()?.nome ?? '';
    return `Deseja excluir o tipo "${nome}"? Tipos vinculados a atividades existentes não podem ser removidos.`;
  });

  ngOnInit(): void {
    void this.facade.carregarTipos();
  }

  protected criarTipo(): void {
    submit(this.novoForm, async () => {
      const ok = await this.facade.criarTipo(this.novoModelo().nome);
      if (ok) {
        this.novoModelo.set({ nome: '' });
        this.novoForm().reset();
      }
    });
  }

  protected iniciarEdicao(tipo: TipoAtividade): void {
    this.editandoId.set(tipo.id);
    this.edicaoModelo.set({ nome: tipo.nome });
    this.edicaoForm().reset();
  }

  protected cancelarEdicao(): void {
    this.editandoId.set(null);
    this.edicaoModelo.set({ nome: '' });
  }

  protected salvarEdicao(id: string): void {
    submit(this.edicaoForm, async () => {
      const ok = await this.facade.renomearTipo(id, this.edicaoModelo().nome);
      if (ok) {
        this.cancelarEdicao();
      }
    });
  }

  protected solicitarExclusao(tipo: TipoAtividade): void {
    this.tipoParaExcluir.set(tipo);
  }

  protected cancelarExclusao(): void {
    this.tipoParaExcluir.set(null);
  }

  protected async confirmarExclusao(): Promise<void> {
    const alvo = this.tipoParaExcluir();
    if (!alvo) {
      return;
    }
    await this.facade.excluirTipo(alvo.id);
    this.tipoParaExcluir.set(null);
  }
}
