import { atividadeVazia, errosAtividade, categoriasDisponiveis } from './atividade';

describe('Regras de atividade com dados mock', () => {
  const categoria = {
    id: 'categoria-1',
    nome: 'Curso',
    descricao: 'Formação',
    natureza: 'formativa' as const,
    ativo: true,
    versao: 0,
  };
  const valido = () => ({
    ...atividadeVazia(),
    natureza: 'formativa' as const,
    titulo: 'Curso',
    descricao: 'Formação docente',
    categoriaId: categoria.id,
    formatoId: 'formato-1',
    cargaHoraria: '20 horas e estudo livre',
    inicio: '2026-11-01',
    fim: '2026-11-02',
    publicoAlvo: 'Docentes',
  });
  it('preserva carga horária textual', () => expect(errosAtividade(valido())).toEqual([]));
  it('valida descrição e objetivo por natureza', () => {
    expect(errosAtividade({ ...valido(), descricao: '' })).toContain('Informe a descrição.');
    expect(errosAtividade({ ...valido(), natureza: 'informativa', descricao: '' })).toContain(
      'Informe o objetivo.',
    );
  });
  it('rejeita período invertido', () =>
    expect(errosAtividade({ ...valido(), fim: '2026-10-01' })).toContain(
      'O fim deve ser igual ou posterior ao início.',
    ));
  it('filtra natureza e mantém referência desativada em edição', () => {
    const inativa = { ...categoria, ativo: false };
    expect(categoriasDisponiveis([inativa], 'formativa', '')).toEqual([]);
    expect(categoriasDisponiveis([inativa], 'formativa', inativa.id)).toEqual([inativa]);
    expect(categoriasDisponiveis([categoria], 'informativa', '')).toEqual([]);
  });
});
