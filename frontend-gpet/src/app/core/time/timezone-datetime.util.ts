export const FUSOS_HORARIOS_COMUNS: readonly string[] = [
  'America/Sao_Paulo',
  'UTC',
  'America/Manaus',
  'America/Belem',
  'America/Fortaleza',
  'America/Recife',
  'America/Cuiaba',
  'America/Campo_Grande',
  'America/Rio_Branco',
  'America/Noronha',
  'America/New_York',
  'Europe/Lisbon',
];

export interface IntervaloFormatado {
  readonly data: string;
  readonly horario: string;
  readonly fuso: string;
  readonly mesmoDia: boolean;
}

interface PartesDataHora {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function obterPartesNoFuso(date: Date, fuso: string): PartesDataHora {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  return {
    year: Number(map['year']),
    month: Number(map['month']),
    day: Number(map['day']),
    hour: Number(map['hour']) % 24,
    minute: Number(map['minute']),
    second: Number(map['second']),
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function fusoHorarioValido(fuso: string): boolean {
  const trimmed = fuso.trim();
  if (!trimmed) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

export function formatarCargaHoraria(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined || Number.isNaN(minutos)) {
    return 'Não informada';
  }
  if (minutos < 60) {
    return `${minutos} min`;
  }
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h ${resto}min`;
}

export function formatarInstanteNoFuso(isoUtc: string, fuso: string): string {
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) {
    return isoUtc;
  }
  const safeZone = fusoHorarioValido(fuso) ? fuso : 'UTC';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: safeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function formatarIntervaloPeriodo(
  inicioIso: string,
  terminoIso: string,
  fuso: string,
): IntervaloFormatado {
  const inicio = new Date(inicioIso);
  const termino = new Date(terminoIso);
  const safeZone = fusoHorarioValido(fuso) ? fuso : 'UTC';

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(termino.getTime())) {
    return {
      data: `${inicioIso} – ${terminoIso}`,
      horario: '',
      fuso: safeZone,
      mesmoDia: false,
    };
  }

  const fmtData = new Intl.DateTimeFormat('pt-BR', {
    timeZone: safeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const fmtHora = new Intl.DateTimeFormat('pt-BR', {
    timeZone: safeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const dataInicio = fmtData.format(inicio);
  const dataTermino = fmtData.format(termino);
  const horaInicio = fmtHora.format(inicio);
  const horaTermino = fmtHora.format(termino);
  const mesmoDia = dataInicio === dataTermino;

  return {
    data: mesmoDia ? dataInicio : `${dataInicio} – ${dataTermino}`,
    horario: `${horaInicio} – ${horaTermino}`,
    fuso: safeZone,
    mesmoDia,
  };
}

export function converterLocalParaUtcRfc3339(localDateTime: string, fuso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    localDateTime.trim(),
  );
  if (!match) {
    throw new Error('Formato de data e hora local inválido.');
  }
  if (!fusoHorarioValido(fuso)) {
    throw new Error('Fuso horário inválido.');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? '0');

  const alvoUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  let estimativaMs = alvoUtcMs;

  // Duas iterações resolvem o offset exato do fuso IANA incluindo transições de DST.
  for (let i = 0; i < 2; i++) {
    const observado = obterPartesNoFuso(new Date(estimativaMs), fuso);
    const observadoMs = Date.UTC(
      observado.year,
      observado.month - 1,
      observado.day,
      observado.hour,
      observado.minute,
      observado.second,
    );
    const diff = alvoUtcMs - observadoMs;
    estimativaMs += diff;
  }

  return new Date(estimativaMs).toISOString();
}

export function converterUtcParaLocalNoFuso(isoUtc: string, fuso: string): string {
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const safeZone = fusoHorarioValido(fuso) ? fuso : 'UTC';
  const partes = obterPartesNoFuso(date, safeZone);
  return `${partes.year}-${pad2(partes.month)}-${pad2(partes.day)}T${pad2(partes.hour)}:${pad2(partes.minute)}`;
}

export function intervaloValido(inicioIso: string, terminoIso: string): boolean {
  if (!inicioIso || !terminoIso) {
    return false;
  }
  const inicioMs = Date.parse(inicioIso);
  const terminoMs = Date.parse(terminoIso);
  if (Number.isNaN(inicioMs) || Number.isNaN(terminoMs)) {
    return false;
  }
  return terminoMs > inicioMs;
}
