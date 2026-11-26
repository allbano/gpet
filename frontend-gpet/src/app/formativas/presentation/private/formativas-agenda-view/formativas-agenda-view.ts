import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import {
  FUSOS_HORARIOS_COMUNS,
  converterLocalParaUtcRfc3339,
  formatarIntervaloPeriodo,
  fusoHorarioValido,
} from '../../../../core/time/timezone-datetime.util';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { LoadingSkeleton } from '../../../../shared/components/loading-skeleton/loading-skeleton';
import { MeioBadge } from '../../../../shared/components/meio-badge/meio-badge';
import { StatusBanner } from '../../../../shared/components/status-banner/status-banner';
import { FormativasPrivateManagerFacade } from '../../../application/formativas-private-manager.facade';

@Component({
  selector: 'app-formativas-agenda-view',
  imports: [RouterLink, FormField, MeioBadge, EmptyState, LoadingSkeleton, StatusBanner],
  templateUrl: './formativas-agenda-view.html',
  styleUrl: './formativas-agenda-view.css',
})
export class FormativasAgendaView implements OnInit {
  protected readonly facade = inject(FormativasPrivateManagerFacade);
  protected readonly fusosComuns = FUSOS_HORARIOS_COMUNS;

  protected readonly filtroModelo = signal({
    inicioLocal: '2026-12-01T00:00',
    terminoLocal: '2026-12-31T23:59',
    fuso: 'America/Sao_Paulo',
  });

  protected readonly filtroForm = form(this.filtroModelo, (s) => {
    required(s.inicioLocal, { message: 'Informe o início da janela.' });
    required(s.terminoLocal, { message: 'Informe o término da janela.' });
    required(s.fuso, { message: 'Informe o fuso horário.' });

    validate(s.fuso, ({ value }) =>
      fusoHorarioValido(value())
        ? undefined
        : { kind: 'invalidTimezone', message: 'Fuso horário IANA inválido.' },
    );

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
        return { kind: 'invalidDatetime', message: 'Intervalo inválido.' };
      }
      return undefined;
    });
  });

  protected readonly ocorrenciasFormatadas = computed(() =>
    this.facade.ocorrencias().map((item) => ({
      origem: item,
      ...formatarIntervaloPeriodo(item.inicio, item.termino, item.fuso),
    })),
  );

  ngOnInit(): void {
    this.aplicarConsulta();
  }

  protected aplicarConsulta(): void {
    submit(this.filtroForm, async () => {
      const { inicioLocal, terminoLocal, fuso } = this.filtroModelo();
      const fusoLimpo = fuso.trim();
      await this.facade.consultarAgenda(
        converterLocalParaUtcRfc3339(inicioLocal, fusoLimpo),
        converterLocalParaUtcRfc3339(terminoLocal, fusoLimpo),
      );
    });
  }

  protected aplicarJanelaMock(): void {
    this.filtroModelo.set({
      inicioLocal: '2026-12-06T00:00',
      terminoLocal: '2026-12-13T00:00',
      fuso: 'America/Sao_Paulo',
    });
    this.aplicarConsulta();
  }
}
