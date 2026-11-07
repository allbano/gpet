export type Natureza = 'informativa' | 'formativa';
export interface Catalogo {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  versao: number;
}
export interface Categoria extends Catalogo {
  natureza: Natureza;
}
export interface AtividadeEditavel {
  natureza: Natureza;
  categoriaId: string;
  formatoId: string;
  titulo: string;
  objetivo: string;
  descricao: string;
  cargaHoraria: string;
  inicio: string;
  fim: string;
  publicoAlvo: string;
  versao: number;
}
export interface Atividade extends Omit<AtividadeEditavel, 'objetivo' | 'descricao'> {
  id: string;
  objetivo: string | null;
  descricao: string | null;
}
export interface AtividadePublica extends Omit<Atividade, 'versao'> {
  categoriaNome: string;
  formatoNome: string;
}
export function atividadeVazia(): AtividadeEditavel {
  return {
    natureza: 'informativa',
    categoriaId: '',
    formatoId: '',
    titulo: '',
    objetivo: '',
    descricao: '',
    cargaHoraria: '',
    inicio: '',
    fim: '',
    publicoAlvo: '',
    versao: 0,
  };
}
export function errosAtividade(a: AtividadeEditavel): string[] {
  const erros: string[] = [];
  if (!a.titulo.trim()) erros.push('Informe o título.');
  if (!a.categoriaId) erros.push('Selecione a categoria.');
  if (!a.formatoId) erros.push('Selecione o formato.');
  if (!a.cargaHoraria.trim()) erros.push('Informe a carga horária.');
  if (!a.publicoAlvo.trim()) erros.push('Informe o público-alvo.');
  if (!a.inicio || !a.fim) erros.push('Informe o período.');
  if (a.inicio && a.fim && a.fim < a.inicio)
    erros.push('O fim deve ser igual ou posterior ao início.');
  if (a.natureza === 'informativa' && !a.objetivo.trim()) erros.push('Informe o objetivo.');
  if (a.natureza === 'formativa' && !a.descricao.trim()) erros.push('Informe a descrição.');
  return erros;
}
export function categoriasDisponiveis(
  categorias: Categoria[],
  natureza: Natureza,
  atual: string,
): Categoria[] {
  return categorias.filter((c) => c.natureza === natureza && (c.ativo || c.id === atual));
}
export function dadosAtividade(a: AtividadeEditavel) {
  return {
    ...a,
    objetivo: a.natureza === 'informativa' ? a.objetivo.trim() : null,
    descricao: a.natureza === 'formativa' ? a.descricao.trim() : null,
  };
}
