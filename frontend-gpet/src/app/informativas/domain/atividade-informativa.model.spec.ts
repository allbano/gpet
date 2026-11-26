import {
  CadastroInformativo,
  DetalheInformativo,
  construirEdicaoInformativa,
  validarCadastroInformativo,
} from './atividade-informativa.model';

describe('AtividadeInformativa domain', () => {
  const cartilhaCadastro: CadastroInformativo = {
    classificacao_id: '019aa000-0000-7000-8000-000000000001',
    meio: 'IMPRESSO',
    titulo: 'Cartilha de divulgação científica',
    descricao: 'Introdução aos métodos e práticas do grupo.',
    conteudo: 'Material impresso distribuído na comunidade.',
    publico_alvo: 'Comunidade externa',
    carga_horaria_minutos: null,
    publicacao_publica: true,
    agenda_pesquisa: false,
  };

  it('deve permitir cartilha pública sem carga horária nem períodos', () => {
    expect(validarCadastroInformativo(cartilhaCadastro)).toBeNull();
  });

  it('deve exigir título, descrição, público-alvo e conteúdo ao publicar', () => {
    expect(validarCadastroInformativo({ ...cartilhaCadastro, titulo: '' })).toBe(
      'Preencha título, descrição e público-alvo',
    );
    expect(
      validarCadastroInformativo({
        ...cartilhaCadastro,
        conteudo: '   ',
        publicacao_publica: true,
      }),
    ).toBe('Para publicar, preencha o conteúdo');
  });

  it('deve construir patch mínimo preservando campos inalterados', () => {
    const atual: DetalheInformativo = {
      id: '019aa000-0001-7000-8000-000000000001',
      classificacao: 'Cartilha',
      ...cartilhaCadastro,
      periodos: [],
    };

    expect(construirEdicaoInformativa(atual, { ...cartilhaCadastro })).toEqual({});
    expect(
      construirEdicaoInformativa(atual, {
        ...cartilhaCadastro,
        agenda_pesquisa: true,
        carga_horaria_minutos: 60,
      }),
    ).toEqual({
      agenda_pesquisa: true,
      carga_horaria_minutos: 60,
    });
  });
});
