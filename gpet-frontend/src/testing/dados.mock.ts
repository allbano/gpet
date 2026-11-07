import { Atividade, Categoria, Catalogo } from '../app/domains/atividades/domain/atividade';
import { Sessao, Usuario } from '../app/domains/identidade/domain/identidade';
export const usuarioMock: Usuario = {
  id: '30000000-0000-0000-0000-000000000001',
  nome: 'Pessoa fictícia',
  login: 'pessoa',
  ativo: true,
  trocarSenha: false,
  versao: 0,
};
export const sessaoMock: Sessao = {
  usuario: usuarioMock,
  csrfToken: 'csrf-ficticio',
  expiraEm: '2026-11-07T12:00:00Z',
};
export const categoriaMock: Categoria = {
  id: '20000000-0000-0000-0000-000000000001',
  nome: 'Curso fictício',
  natureza: 'formativa',
  descricao: 'Formação de teste',
  ativo: true,
  versao: 0,
};
export const formatoMock: Catalogo = {
  id: '10000000-0000-0000-0000-000000000001',
  nome: 'Presencial',
  descricao: 'Formato de teste',
  ativo: true,
  versao: 0,
};
export const atividadeMock: Atividade = {
  id: '40000000-0000-0000-0000-000000000001',
  natureza: 'formativa',
  categoriaId: categoriaMock.id,
  formatoId: formatoMock.id,
  titulo: 'Curso de teste',
  objetivo: null,
  descricao: 'Formação docente fictícia',
  cargaHoraria: '20 horas e estudo livre',
  inicio: '2026-11-01',
  fim: '2026-11-02',
  publicoAlvo: 'Docentes fictícios',
  versao: 0,
};
