export type MeioFormativo = 'ONLINE' | 'PRESENCIAL' | 'HIBRIDO' | 'IMPRESSO';

export interface OpcaoMeioFormativo {
  readonly valor: MeioFormativo;
  readonly rotulo: string;
  readonly descricao: string;
}

export const MEIOS_FORMATIVOS: readonly OpcaoMeioFormativo[] = [
  {
    valor: 'ONLINE',
    rotulo: 'Online',
    descricao: 'Realização remota síncrona ou assíncrona.',
  },
  {
    valor: 'PRESENCIAL',
    rotulo: 'Presencial',
    descricao: 'Encontros em espaço físico definido.',
  },
  {
    valor: 'HIBRIDO',
    rotulo: 'Híbrido',
    descricao: 'Combinação de participação presencial e remota.',
  },
  {
    valor: 'IMPRESSO',
    rotulo: 'Impresso',
    descricao: 'Material formativo distribuído em meio físico.',
  },
];
