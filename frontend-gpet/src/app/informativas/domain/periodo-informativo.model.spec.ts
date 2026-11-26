import { validarHorarioInformativo } from './periodo-informativo.model';

describe('PeriodoInformativo domain', () => {
  it('deve validar intervalo positivo e fuso horário preenchido', () => {
    expect(
      validarHorarioInformativo({
        inicio: '2026-12-07T11:00:00Z',
        termino: '2026-12-07T15:00:00Z',
        fuso: 'America/Sao_Paulo',
      }),
    ).toBeNull();

    expect(
      validarHorarioInformativo({
        inicio: '2026-12-07T15:00:00Z',
        termino: '2026-12-07T15:00:00Z',
        fuso: 'America/Sao_Paulo',
      }),
    ).toBe('O término deve ser posterior ao início');

    expect(
      validarHorarioInformativo({
        inicio: '2026-12-07T11:00:00Z',
        termino: '2026-12-07T15:00:00Z',
        fuso: ' ',
      }),
    ).toBe('Informe o fuso horário');
  });
});
