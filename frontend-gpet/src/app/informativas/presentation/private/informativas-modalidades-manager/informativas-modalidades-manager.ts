import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../../../shared/components/loading-skeleton/loading-skeleton';
import { StatusBanner } from '../../../../shared/components/status-banner/status-banner';
import { InformativasPrivateManagerFacade } from '../../../application/informativas-private-manager.facade';
import { Modalidade } from '../../../domain/modalidade.model';

@Component({
  selector: 'app-informativas-modalidades-manager',
  imports: [FormField, ConfirmDialog, EmptyState, LoadingSkeleton, StatusBanner],
  templateUrl: './informativas-modalidades-manager.html',
  styleUrl: './informativas-modalidades-manager.css',
})
export class InformativasModalidadesManager implements OnInit {
  protected readonly facade = inject(InformativasPrivateManagerFacade);

  protected readonly novoModelo = signal({ nome: '' });
  protected readonly novoForm = form(this.novoModelo, (s) => {
    required(s.nome, { message: 'Preencha o nome da modalidade.' });
    validate(s.nome, ({ value }) =>
      value().trim() ? undefined : { kind: 'blank', message: 'Preencha o nome da modalidade.' },
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

  protected readonly modalidadeParaExcluir = signal<Modalidade | null>(null);
  protected readonly mensagemConfirmacaoExclusao = computed(() => {
    const nome = this.modalidadeParaExcluir()?.nome ?? '';
    return `Deseja excluir a modalidade "${nome}"? Modalidades vinculadas a atividades existentes não podem ser removidas.`;
  });

  ngOnInit(): void {
    void this.facade.carregarModalidades();
  }

  protected criarModalidade(): void {
    submit(this.novoForm, async () => {
      const ok = await this.facade.criarModalidade(this.novoModelo().nome);
      if (ok) {
        this.novoModelo.set({ nome: '' });
        this.novoForm().reset();
      }
    });
  }

  protected iniciarEdicao(modalidade: Modalidade): void {
    this.editandoId.set(modalidade.id);
    this.edicaoModelo.set({ nome: modalidade.nome });
    this.edicaoForm().reset();
  }

  protected cancelarEdicao(): void {
    this.editandoId.set(null);
    this.edicaoModelo.set({ nome: '' });
  }

  protected salvarEdicao(id: string): void {
    submit(this.edicaoForm, async () => {
      const ok = await this.facade.renomearModalidade(id, this.edicaoModelo().nome);
      if (ok) {
        this.cancelarEdicao();
      }
    });
  }

  protected solicitarExclusao(modalidade: Modalidade): void {
    this.modalidadeParaExcluir.set(modalidade);
  }

  protected cancelarExclusao(): void {
    this.modalidadeParaExcluir.set(null);
  }

  protected async confirmarExclusao(): Promise<void> {
    const alvo = this.modalidadeParaExcluir();
    if (!alvo) {
      return;
    }
    await this.facade.excluirModalidade(alvo.id);
    this.modalidadeParaExcluir.set(null);
  }
}
