/**
 * Value object que representa um item de navegação.
 * Pertence ao Shared Kernel: pode ser usado por qualquer bounded context.
 */
export interface MenuItem {
  readonly label: string;
  readonly route: string;
  readonly children?: readonly MenuItem[];
}

