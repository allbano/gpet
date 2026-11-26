import { validarHorarioFormativo } from './periodo-formativo.model';

describe('PeriodoFormativo domain', () => {
  it('deve validar intervalo positivo e fuso horário preenchido', () => {
    expect(
      validarHorarioFormativo({
        inicio: '2026-12-07T11:00:00Z',
        termino: '2026-12-07T15:00:00Z',
        fuso: 'America/Sao_Paulo',
      }),
    ).toBeNull();

    expect(
      validarHorarioFormativo({
        inicio: '2026-12-07T15:00:00Z',
        termino: '2026-12-07T15:00:00Z',
        fuso: 'America/Sao_Paulo',
      }),
    ).toBe('O término deve ser posterior ao início');

    expect(
      validarHorarioFormativo({
        inicio: '2026-12-07T11:00:00Z',
        termino: '2026-12-07T15:00:00Z',
        fuso: '   ',
      }),
    ).toBe('Informe o fuso horário');
  });
});
