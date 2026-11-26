import {
  converterLocalParaUtcRfc3339,
  converterUtcParaLocalNoFuso,
  formatarCargaHoraria,
  formatarInstanteNoFuso,
  formatarIntervaloPeriodo,
  intervaloValido,
} from './timezone-datetime.util';

describe('timezone-datetime.util', () => {
  it('deve formatar carga horária em minutos e horas legíveis', () => {
    expect(formatarCargaHoraria(null)).toBe('Não informada');
    expect(formatarCargaHoraria(undefined)).toBe('Não informada');
    expect(formatarCargaHoraria(0)).toBe('0 min');
    expect(formatarCargaHoraria(45)).toBe('45 min');
    expect(formatarCargaHoraria(60)).toBe('1h');
    expect(formatarCargaHoraria(90)).toBe('1h 30min');
    expect(formatarCargaHoraria(1140)).toBe('19h');
  });

  it('deve formatar instante UTC no fuso informado', () => {
    // 2026-12-07T11:00:00Z = 08:00 em America/Sao_Paulo (-03:00)
    const formatado = formatarInstanteNoFuso('2026-12-07T11:00:00Z', 'America/Sao_Paulo');
    expect(formatado).toContain('07/12/2026');
    expect(formatado).toContain('08:00');
  });

  it('deve formatar intervalo de período no mesmo dia preservando o fuso', () => {
    const intervalo = formatarIntervaloPeriodo(
      '2026-12-07T11:00:00Z',
      '2026-12-07T15:00:00Z',
      'America/Sao_Paulo',
    );

    expect(intervalo.mesmoDia).toBe(true);
    expect(intervalo.data).toBe('07/12/2026');
    expect(intervalo.horario).toBe('08:00 – 12:00');
    expect(intervalo.fuso).toBe('America/Sao_Paulo');
  });

  it('deve formatar intervalo de período que cruza a meia-noite no fuso', () => {
    const intervalo = formatarIntervaloPeriodo(
      '2026-12-08T01:00:00Z',
      '2026-12-08T04:00:00Z',
      'America/Sao_Paulo',
    );

    // 22:00 do dia 07 até 01:00 do dia 08 em America/Sao_Paulo
    expect(intervalo.mesmoDia).toBe(false);
    expect(intervalo.data).toContain('07/12/2026');
    expect(intervalo.data).toContain('08/12/2026');
  });

  it('deve converter datetime-local no fuso America/Sao_Paulo para RFC 3339 UTC e vice-versa', () => {
    const utc = converterLocalParaUtcRfc3339('2026-12-07T08:00', 'America/Sao_Paulo');
    expect(utc).toBe('2026-12-07T11:00:00.000Z');

    const local = converterUtcParaLocalNoFuso(utc, 'America/Sao_Paulo');
    expect(local).toBe('2026-12-07T08:00');
  });

  it('deve converter datetime-local em UTC e America/Manaus corretamente', () => {
    expect(converterLocalParaUtcRfc3339('2026-12-07T10:00', 'UTC')).toBe(
      '2026-12-07T10:00:00.000Z',
    );
    expect(converterLocalParaUtcRfc3339('2026-12-07T08:00', 'America/Manaus')).toBe(
      '2026-12-07T12:00:00.000Z',
    );
    expect(converterUtcParaLocalNoFuso('2026-12-07T12:00:00Z', 'America/Manaus')).toBe(
      '2026-12-07T08:00',
    );
  });

  it('deve validar se término é estritamente posterior ao início', () => {
    expect(intervaloValido('2026-12-07T11:00:00Z', '2026-12-07T12:00:00Z')).toBe(true);
    expect(intervaloValido('2026-12-07T12:00:00Z', '2026-12-07T12:00:00Z')).toBe(false);
    expect(intervaloValido('2026-12-07T13:00:00Z', '2026-12-07T12:00:00Z')).toBe(false);
    expect(intervaloValido('', '2026-12-07T12:00:00Z')).toBe(false);
  });
});
