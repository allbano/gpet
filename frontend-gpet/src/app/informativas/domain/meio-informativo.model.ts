export type MeioInformativo = 'ONLINE' | 'PRESENCIAL' | 'HIBRIDO' | 'IMPRESSO';

export interface OpcaoMeioInformativo {
  readonly valor: MeioInformativo;
  readonly rotulo: string;
  readonly descricao: string;
}

export const MEIOS_INFORMATIVOS: readonly OpcaoMeioInformativo[] = [
  {
    valor: 'IMPRESSO',
    rotulo: 'Impresso',
    descricao: 'Cartilha, folheto ou publicação física distribuída ao público.',
  },
  {
    valor: 'ONLINE',
    rotulo: 'Online',
    descricao: 'Boletim, página ou divulgação digital acessível remotamente.',
  },
  {
    valor: 'PRESENCIAL',
    rotulo: 'Presencial',
    descricao: 'Encontro informativo ou exposição em espaço físico.',
  },
  {
    valor: 'HIBRIDO',
    rotulo: 'Híbrido',
    descricao: 'Divulgação combinando formato presencial e digital.',
  },
];
