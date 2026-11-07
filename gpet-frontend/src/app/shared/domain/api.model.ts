export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  tamanho: number;
}
export interface ErroApi {
  codigo: string;
  mensagem: string;
}
