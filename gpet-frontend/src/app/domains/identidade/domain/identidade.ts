export interface Usuario {
  id: string;
  nome: string;
  login: string;
  ativo: boolean;
  trocarSenha: boolean;
  versao: number;
}
export interface Sessao {
  usuario: Usuario;
  csrfToken: string;
  expiraEm: string;
}
