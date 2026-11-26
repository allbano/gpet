import { PeriodoFusoPipe } from './periodo-fuso.pipe';

describe('PeriodoFusoPipe', () => {
  const pipe = new PeriodoFusoPipe();

  it('deve formatar instante ISO no fuso informado', () => {
    const result = pipe.transform('2026-12-07T11:00:00Z', 'America/Sao_Paulo');
    expect(result).toContain('07/12/2026');
    expect(result).toContain('08:00');
  });
});
