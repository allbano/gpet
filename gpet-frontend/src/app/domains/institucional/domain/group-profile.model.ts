/** Entidade do domínio institucional: apresentação do grupo de pesquisa. */
export interface GroupProfile {
  readonly name: string;
  readonly logoSrc: string;
  readonly logoAlt: string;
  readonly aboutTitle: string;
  readonly about: string;
  readonly photoSrc: string | null;
  readonly photoAlt: string;
}

