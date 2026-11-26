import { Component, computed, inject, input, signal } from '@angular/core';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import {
  FUSOS_HORARIOS_COMUNS,
  converterLocalParaUtcRfc3339,
  converterUtcParaLocalNoFuso,
  formatarIntervaloPeriodo,
  fusoHorarioValido,
} from '../../../../core/time/timezone-datetime.util';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { StatusBanner } from '../../../../shared/components/status-banner/status-banner';
import { FormativasPrivateManagerFacade } from '../../../application/formativas-private-manager.facade';
import { PeriodoFormativo } from '../../../domain/periodo-formativo.model';

@Component({
  selector: 'app-formativas-periodos-manager',
  imports: [FormField, ConfirmDialog, StatusBanner],
  templateUrl: './formativas-periodos-manager.html',
  styleUrl: './formativas-periodos-manager.css',
})
export class FormativasPeriodosManager {
  readonly atividadeId = input.required<string>();
  readonly periodos = input.required<readonly PeriodoFormativo[]>();

  protected readonly facade = inject(FormativasPrivateManagerFacade);
  protected readonly fusosComuns = FUSOS_HORARIOS_COMUNS;
  protected readonly periodoEmEdicaoId = signal<string | null>(null);
  protected readonly periodoParaRemover = signal<PeriodoFormativo | null>(null);

  protected readonly periodosFormatados = computed(() =>
    this.periodos().map((periodo) => ({
      origem: periodo,
      ...formatarIntervaloPeriodo(periodo.inicio, periodo.termino, periodo.fuso),
    })),
  );

  protected readonly periodoModelo = signal({
    inicioLocal: '',
    terminoLocal: '',
    fuso: 'America/Sao_Paulo',
  });

  protected readonly periodoForm = form(this.periodoModelo, (s) => {
    required(s.inicioLocal, { message: 'Informe a data e hora de início.' });
    required(s.terminoLocal, { message: 'Informe a data e hora de término.' });
    required(s.fuso, { message: 'Informe o fuso horário.' });

    validate(s.fuso, ({ value }) => {
      const fuso = value().trim();
      if (!fuso) {
        return undefined;
      }
      return fusoHorarioValido(fuso)
        ? undefined
        : { kind: 'invalidTimezone', message: 'Fuso horário IANA inválido (ex.: America/Sao_Paulo).' };
    });

    validate(s.terminoLocal, ({ value, valueOf }) => {
      const terminoLocal = value();
      const inicioLocal = valueOf(s.inicioLocal);
      const fuso = valueOf(s.fuso).trim();
      if (!terminoLocal || !inicioLocal || !fusoHorarioValido(fuso)) {
        return undefined;
      }
      try {
        const inicioUtc = converterLocalParaUtcRfc3339(inicioLocal, fuso);
        const terminoUtc = converterLocalParaUtcRfc3339(terminoLocal, fuso);
        if (Date.parse(terminoUtc) <= Date.parse(inicioUtc)) {
          return { kind: 'range', message: 'O término deve ser posterior ao início.' };
        }
      } catch {
        return { kind: 'invalidDatetime', message: 'Data ou horário inválido.' };
      }
      return undefined;
    });
  });

  protected iniciarEdicao(periodo: PeriodoFormativo): void {
    this.periodoEmEdicaoId.set(periodo.id);
    this.periodoModelo.set({
      inicioLocal: converterUtcParaLocalNoFuso(periodo.inicio, periodo.fuso),
      terminoLocal: converterUtcParaLocalNoFuso(periodo.termino, periodo.fuso),
      fuso: periodo.fuso,
    });
    this.periodoForm().reset();
  }

  protected cancelarEdicao(): void {
    this.periodoEmEdicaoId.set(null);
    this.periodoModelo.set({
      inicioLocal: '',
      terminoLocal: '',
      fuso: 'America/Sao_Paulo',
    });
    this.periodoForm().reset();
  }

  protected salvarPeriodo(): void {
    submit(this.periodoForm, async () => {
      const { inicioLocal, terminoLocal, fuso } = this.periodoModelo();
      const fusoLimpo = fuso.trim();
      const horario = {
        inicio: converterLocalParaUtcRfc3339(inicioLocal, fusoLimpo),
        termino: converterLocalParaUtcRfc3339(terminoLocal, fusoLimpo),
        fuso: fusoLimpo,
      };

      const edicaoId = this.periodoEmEdicaoId();
      const ok = edicaoId
        ? await this.facade.editarPeriodo(this.atividadeId(), edicaoId, horario)
        : await this.facade.adicionarPeriodo(this.atividadeId(), horario);

      if (ok) {
        this.cancelarEdicao();
      }
    });
  }

  protected solicitarRemocao(periodo: PeriodoFormativo): void {
    this.periodoParaRemover.set(periodo);
  }

  protected cancelarRemocao(): void {
    this.periodoParaRemover.set(null);
  }

  protected async confirmarRemocao(): Promise<void> {
    const alvo = this.periodoParaRemover();
    if (!alvo) {
      return;
    }
    await this.facade.excluirPeriodo(this.atividadeId(), alvo.id);
    if (this.periodoEmEdicaoId() === alvo.id) {
      this.cancelarEdicao();
    }
    this.periodoParaRemover.set(null);
  }
}
