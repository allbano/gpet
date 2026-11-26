import { fusoHorarioValido, intervaloValido } from '../../core/time/timezone-datetime.util';

export interface PeriodoFormativo {
  readonly id: string;
  readonly inicio: string;
  readonly termino: string;
  readonly fuso: string;
}

export interface HorarioFormativo {
  readonly inicio: string;
  readonly termino: string;
  readonly fuso: string;
}

export interface EdicaoHorarioFormativo {
  readonly inicio?: string;
  readonly termino?: string;
  readonly fuso?: string;
}

export function validarHorarioFormativo(horario: HorarioFormativo): string | null {
  if (!intervaloValido(horario.inicio, horario.termino)) {
    return 'O término deve ser posterior ao início';
  }
  if (!horario.fuso.trim() || !fusoHorarioValido(horario.fuso)) {
    return 'Informe o fuso horário';
  }
  return null;
}
