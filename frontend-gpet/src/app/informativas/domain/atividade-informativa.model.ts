import { MeioInformativo } from './meio-informativo.model';
import { PeriodoInformativo } from './periodo-informativo.model';

export interface IdentificadorInformativo {
  readonly id: string;
}

export interface PaginacaoInformativa {
  readonly limite?: number;
  readonly cursor?: string | null;
}

export interface PaginaInformativa<T> {
  readonly itens: readonly T[];
  readonly proximo_cursor: string | null;
}

export interface CartaoInformativo {
  readonly id: string;
  readonly titulo: string;
  readonly descricao: string;
  readonly meio: MeioInformativo;
  readonly classificacao_id: string;
  readonly classificacao: string;
}

export interface CadastroInformativo {
  readonly classificacao_id: string;
  readonly meio: MeioInformativo;
  readonly titulo: string;
  readonly descricao: string;
  readonly conteudo: string;
  readonly publico_alvo: string;
  readonly carga_horaria_minutos: number | null;
  readonly publicacao_publica: boolean;
  readonly agenda_pesquisa: boolean;
}

export interface EdicaoInformativa {
  readonly classificacao_id?: string;
  readonly meio?: MeioInformativo;
  readonly titulo?: string;
  readonly descricao?: string;
  readonly conteudo?: string;
  readonly publico_alvo?: string;
  readonly carga_horaria_minutos?: number | null;
  readonly publicacao_publica?: boolean;
  readonly agenda_pesquisa?: boolean;
}

export interface DetalheInformativo extends CadastroInformativo {
  readonly id: string;
  readonly classificacao: string;
  readonly periodos: readonly PeriodoInformativo[];
}

export interface OcorrenciaInformativa {
  readonly atividade_id: string;
  readonly periodo_id: string;
  readonly titulo: string;
  readonly descricao: string;
  readonly natureza: string;
  readonly meio: MeioInformativo;
  readonly publico_alvo: string;
  readonly inicio: string;
  readonly termino: string;
  readonly fuso: string;
}

export interface JanelaAgendaInformativa {
  readonly inicio: string;
  readonly termino: string;
  readonly limite?: number;
  readonly cursor?: string | null;
}

export function validarCadastroInformativo(cadastro: CadastroInformativo): string | null {
  if (!cadastro.classificacao_id.trim()) {
    return 'Selecione a modalidade';
  }
  if (!cadastro.titulo.trim() || !cadastro.descricao.trim() || !cadastro.publico_alvo.trim()) {
    return 'Preencha título, descrição e público-alvo';
  }
  if (
    cadastro.carga_horaria_minutos !== null &&
    (!Number.isInteger(cadastro.carga_horaria_minutos) || cadastro.carga_horaria_minutos < 0)
  ) {
    return 'A carga horária deve ser não negativa';
  }
  if (cadastro.publicacao_publica && !cadastro.conteudo.trim()) {
    return 'Para publicar, preencha o conteúdo';
  }
  return null;
}

export function construirEdicaoInformativa(
  atual: DetalheInformativo,
  proximo: CadastroInformativo,
): EdicaoInformativa {
  return {
    ...(proximo.classificacao_id !== atual.classificacao_id
      ? { classificacao_id: proximo.classificacao_id }
      : {}),
    ...(proximo.meio !== atual.meio ? { meio: proximo.meio } : {}),
    ...(proximo.titulo !== atual.titulo ? { titulo: proximo.titulo } : {}),
    ...(proximo.descricao !== atual.descricao ? { descricao: proximo.descricao } : {}),
    ...(proximo.conteudo !== atual.conteudo ? { conteudo: proximo.conteudo } : {}),
    ...(proximo.publico_alvo !== atual.publico_alvo ? { publico_alvo: proximo.publico_alvo } : {}),
    ...(proximo.carga_horaria_minutos !== atual.carga_horaria_minutos
      ? { carga_horaria_minutos: proximo.carga_horaria_minutos }
      : {}),
    ...(proximo.publicacao_publica !== atual.publicacao_publica
      ? { publicacao_publica: proximo.publicacao_publica }
      : {}),
    ...(proximo.agenda_pesquisa !== atual.agenda_pesquisa
      ? { agenda_pesquisa: proximo.agenda_pesquisa }
      : {}),
  };
}
