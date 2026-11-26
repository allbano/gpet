import { validarNomeModalidade } from './modalidade.model';

describe('Modalidade domain', () => {
  it('deve exigir nome não vazio após trim', () => {
    expect(validarNomeModalidade('')).toBe('Preencha o nome da classificação');
    expect(validarNomeModalidade('   ')).toBe('Preencha o nome da classificação');
    expect(validarNomeModalidade('Cartilha')).toBeNull();
  });
});
