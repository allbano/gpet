export interface Modalidade {
  readonly id: string;
  readonly nome: string;
}

export function validarNomeModalidade(nome: string): string | null {
  if (!nome.trim()) {
    return 'Preencha o nome da classificação';
  }
  return null;
}
