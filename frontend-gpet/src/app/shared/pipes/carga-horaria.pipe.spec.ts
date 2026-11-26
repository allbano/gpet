import { CargaHorariaPipe } from './carga-horaria.pipe';

describe('CargaHorariaPipe', () => {
  const pipe = new CargaHorariaPipe();

  it('deve formatar carga horária nula e positiva', () => {
    expect(pipe.transform(null)).toBe('Não informada');
    expect(pipe.transform(undefined)).toBe('Não informada');
    expect(pipe.transform(45)).toBe('45 min');
    expect(pipe.transform(120)).toBe('2h');
    expect(pipe.transform(1140)).toBe('19h');
  });
});
