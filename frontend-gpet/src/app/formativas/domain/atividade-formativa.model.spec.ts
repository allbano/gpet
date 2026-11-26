import {
  CadastroFormativo,
  DetalheFormativo,
  construirEdicaoFormativa,
  validarCadastroFormativo,
} from './atividade-formativa.model';

describe('AtividadeFormativa domain', () => {
  const baseCadastro: CadastroFormativo = {
    classificacao_id: '019aa000-0000-7000-8000-000000000001',
    meio: 'HIBRIDO',
    titulo: 'Minicurso de pesquisa',
    descricao: 'Introdução aos métodos do grupo.',
    conteudo: 'Leitura orientada e práticas.',
    publico_alvo: 'Graduação',
    carga_horaria_minutos: 120,
    publicacao_publica: true,
    agenda_pesquisa: true,
  };

  it('deve aceitar cadastro válido e exigir título, descrição e público-alvo', () => {
    expect(validarCadastroFormativo(baseCadastro)).toBeNull();
    expect(validarCadastroFormativo({ ...baseCadastro, titulo: '   ' })).toBe(
      'Preencha título, descrição e público-alvo',
    );
    expect(validarCadastroFormativo({ ...baseCadastro, descricao: '' })).toBe(
      'Preencha título, descrição e público-alvo',
    );
    expect(validarCadastroFormativo({ ...baseCadastro, publico_alvo: ' ' })).toBe(
      'Preencha título, descrição e público-alvo',
    );
  });

  it('deve rejeitar carga horária negativa', () => {
    expect(validarCadastroFormativo({ ...baseCadastro, carga_horaria_minutos: -10 })).toBe(
      'A carga horária deve ser não negativa',
    );
  });

  it('deve exigir conteúdo preenchido quando publicacao_publica for true', () => {
    expect(
      validarCadastroFormativo({ ...baseCadastro, conteudo: '   ', publicacao_publica: false }),
    ).toBeNull();
    expect(
      validarCadastroFormativo({ ...baseCadastro, conteudo: '   ', publicacao_publica: true }),
    ).toBe('Para publicar, preencha o conteúdo');
  });

  it('deve construir patch mínimo preservando ou limpando carga horária conforme alteração', () => {
    const atual: DetalheFormativo = {
      id: '019aa000-0001-7000-8000-000000000001',
      classificacao: 'Minicurso',
      ...baseCadastro,
      periodos: [],
    };

    expect(construirEdicaoFormativa(atual, { ...baseCadastro })).toEqual({});

    const alterado = construirEdicaoFormativa(atual, {
      ...baseCadastro,
      titulo: 'Novo título',
      carga_horaria_minutos: null,
    });
    expect(alterado).toEqual({
      titulo: 'Novo título',
      carga_horaria_minutos: null,
    });
  });
});
