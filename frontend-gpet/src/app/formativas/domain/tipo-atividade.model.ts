export interface TipoAtividade {
  readonly id: string;
  readonly nome: string;
}

export function validarNomeTipoAtividade(nome: string): string | null {
  if (!nome.trim()) {
    return 'Preencha o nome da classificação';
  }
  return null;
}
