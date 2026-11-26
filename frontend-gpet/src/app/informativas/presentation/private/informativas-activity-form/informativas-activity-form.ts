import { Component, OnDestroy, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { LoadingSkeleton } from '../../../../shared/components/loading-skeleton/loading-skeleton';
import { StatusBanner } from '../../../../shared/components/status-banner/status-banner';
import { InformativasPrivateManagerFacade } from '../../../application/informativas-private-manager.facade';
import { CadastroInformativo } from '../../../domain/atividade-informativa.model';
import { MEIOS_INFORMATIVOS, MeioInformativo } from '../../../domain/meio-informativo.model';
import { InformativasPeriodosManager } from '../informativas-periodos-manager/informativas-periodos-manager';

@Component({
  selector: 'app-informativas-activity-form',
  imports: [
    RouterLink,
    FormField,
    ConfirmDialog,
    LoadingSkeleton,
    StatusBanner,
    InformativasPeriodosManager,
  ],
  templateUrl: './informativas-activity-form.html',
  styleUrl: './informativas-activity-form.css',
})
export class InformativasActivityForm implements OnInit, OnDestroy {
  readonly id = input<string | undefined>(undefined);

  protected readonly facade = inject(InformativasPrivateManagerFacade);
  private readonly router = inject(Router);

  protected readonly meios = MEIOS_INFORMATIVOS;
  protected readonly confirmarExclusaoAberto = signal(false);
  protected readonly emEdicao = computed(() => Boolean(this.id()));

  protected readonly modelo = signal({
    classificacaoId: '',
    meio: 'IMPRESSO' as MeioInformativo,
    titulo: '',
    descricao: '',
    conteudo: '',
    publicoAlvo: '',
    cargaHorariaTexto: '',
    publicacaoPublica: false,
    agendaPesquisa: false,
  });

  protected readonly atividadeForm = form(this.modelo, (s) => {
    required(s.classificacaoId, { message: 'Selecione a modalidade.' });
    required(s.titulo, { message: 'Informe o título da atividade.' });
    validate(s.titulo, ({ value }) =>
      value().trim() ? undefined : { kind: 'blank', message: 'Informe o título da atividade.' },
    );

    required(s.descricao, { message: 'Informe uma descrição resumida.' });
    validate(s.descricao, ({ value }) =>
      value().trim() ? undefined : { kind: 'blank', message: 'Informe uma descrição resumida.' },
    );

    required(s.publicoAlvo, { message: 'Informe o público-alvo.' });
    validate(s.publicoAlvo, ({ value }) =>
      value().trim() ? undefined : { kind: 'blank', message: 'Informe o público-alvo.' },
    );

    required(s.conteudo, {
      when: ({ valueOf }) => valueOf(s.publicacaoPublica),
      message: 'Para publicar, preencha o conteúdo',
    });
    validate(s.conteudo, ({ value, valueOf }) => {
      if (valueOf(s.publicacaoPublica) && !value().trim()) {
        return { kind: 'publishContent', message: 'Para publicar, preencha o conteúdo' };
      }
      return undefined;
    });

    validate(s.cargaHorariaTexto, ({ value }) => {
      const texto = value().trim();
      if (!texto) {
        return undefined;
      }
      if (!/^\d+$/.test(texto)) {
        return {
          kind: 'invalidNumber',
          message: 'Informe um número inteiro não negativo de minutos.',
        };
      }
      return undefined;
    });
  });

  constructor() {
    effect(() => {
      const atividadeId = this.id();
      if (atividadeId) {
        void this.facade.carregarAtividade(atividadeId);
      } else {
        this.facade.limparAtividadeAtual();
      }
    });

    effect(() => {
      const atual = this.facade.atividadeAtual();
      if (atual && this.id() === atual.id) {
        this.modelo.set({
          classificacaoId: atual.classificacao_id,
          meio: atual.meio,
          titulo: atual.titulo,
          descricao: atual.descricao,
          conteudo: atual.conteudo,
          publicoAlvo: atual.publico_alvo,
          cargaHorariaTexto:
            atual.carga_horaria_minutos !== null ? String(atual.carga_horaria_minutos) : '',
          publicacaoPublica: atual.publicacao_publica,
          agendaPesquisa: atual.agenda_pesquisa,
        });
      }
    });
  }

  ngOnInit(): void {
    void this.facade.carregarModalidades();
  }

  ngOnDestroy(): void {
    this.facade.limparAtividadeAtual();
  }

  protected salvar(): void {
    submit(this.atividadeForm, async () => {
      const m = this.modelo();
      const cargaTexto = m.cargaHorariaTexto.trim();
      const cadastro: CadastroInformativo = {
        classificacao_id: m.classificacaoId,
        meio: m.meio,
        titulo: m.titulo.trim(),
        descricao: m.descricao.trim(),
        conteudo: m.conteudo,
        publico_alvo: m.publicoAlvo.trim(),
        carga_horaria_minutos: cargaTexto === '' ? null : Number(cargaTexto),
        publicacao_publica: m.publicacaoPublica,
        agenda_pesquisa: m.agendaPesquisa,
      };

      const atividadeId = this.id();
      const atual = this.facade.atividadeAtual();
      if (atividadeId && atual) {
        await this.facade.editarAtividade(atividadeId, atual, cadastro);
        return;
      }

      const novoId = await this.facade.criarAtividade(cadastro);
      if (novoId) {
        await this.router.navigate(['/private/informativas/atividades', novoId]);
      }
    });
  }

  protected async confirmarExclusao(): Promise<void> {
    const atividadeId = this.id();
    if (!atividadeId) {
      return;
    }
    const ok = await this.facade.excluirAtividade(atividadeId);
    this.confirmarExclusaoAberto.set(false);
    if (ok) {
      await this.router.navigate(['/private/informativas/atividades']);
    }
  }
}
