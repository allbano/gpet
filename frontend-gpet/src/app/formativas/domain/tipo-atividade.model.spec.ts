import { validarNomeTipoAtividade } from './tipo-atividade.model';

describe('TipoAtividade domain', () => {
  it('deve exigir nome não vazio após trim', () => {
    expect(validarNomeTipoAtividade('')).toBe('Preencha o nome da classificação');
    expect(validarNomeTipoAtividade('   ')).toBe('Preencha o nome da classificação');
    expect(validarNomeTipoAtividade('Minicurso')).toBeNull();
  });
});
