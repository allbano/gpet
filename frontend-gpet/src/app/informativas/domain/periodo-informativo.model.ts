import { fusoHorarioValido, intervaloValido } from '../../core/time/timezone-datetime.util';

export interface PeriodoInformativo {
  readonly id: string;
  readonly inicio: string;
  readonly termino: string;
  readonly fuso: string;
}

export interface HorarioInformativo {
  readonly inicio: string;
  readonly termino: string;
  readonly fuso: string;
}

export interface EdicaoHorarioInformativo {
  readonly inicio?: string;
  readonly termino?: string;
  readonly fuso?: string;
}

export function validarHorarioInformativo(horario: HorarioInformativo): string | null {
  if (!intervaloValido(horario.inicio, horario.termino)) {
    return 'O término deve ser posterior ao início';
  }
  if (!horario.fuso.trim() || !fusoHorarioValido(horario.fuso)) {
    return 'Informe o fuso horário';
  }
  return null;
}
