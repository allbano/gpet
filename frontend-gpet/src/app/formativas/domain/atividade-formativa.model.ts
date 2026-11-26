import { MeioFormativo } from './meio-formativo.model';
import { PeriodoFormativo } from './periodo-formativo.model';

export interface IdentificadorFormativo {
  readonly id: string;
}

export interface PaginacaoFormativa {
  readonly limite?: number;
  readonly cursor?: string | null;
}

export interface PaginaFormativa<T> {
  readonly itens: readonly T[];
  readonly proximo_cursor: string | null;
}

export interface CartaoFormativo {
  readonly id: string;
  readonly titulo: string;
  readonly descricao: string;
  readonly meio: MeioFormativo;
  readonly classificacao_id: string;
  readonly classificacao: string;
}

export interface CadastroFormativo {
  readonly classificacao_id: string;
  readonly meio: MeioFormativo;
  readonly titulo: string;
  readonly descricao: string;
  readonly conteudo: string;
  readonly publico_alvo: string;
  readonly carga_horaria_minutos: number | null;
  readonly publicacao_publica: boolean;
  readonly agenda_pesquisa: boolean;
}

export interface EdicaoFormativa {
  readonly classificacao_id?: string;
  readonly meio?: MeioFormativo;
  readonly titulo?: string;
  readonly descricao?: string;
  readonly conteudo?: string;
  readonly publico_alvo?: string;
  readonly carga_horaria_minutos?: number | null;
  readonly publicacao_publica?: boolean;
  readonly agenda_pesquisa?: boolean;
}

export interface DetalheFormativo extends CadastroFormativo {
  readonly id: string;
  readonly classificacao: string;
  readonly periodos: readonly PeriodoFormativo[];
}

export interface OcorrenciaFormativa {
  readonly atividade_id: string;
  readonly periodo_id: string;
  readonly titulo: string;
  readonly descricao: string;
  readonly natureza: string;
  readonly meio: MeioFormativo;
  readonly publico_alvo: string;
  readonly inicio: string;
  readonly termino: string;
  readonly fuso: string;
}

export interface JanelaAgendaFormativa {
  readonly inicio: string;
  readonly termino: string;
  readonly limite?: number;
  readonly cursor?: string | null;
}

export function validarCadastroFormativo(cadastro: CadastroFormativo): string | null {
  if (!cadastro.classificacao_id.trim()) {
    return 'Selecione o tipo de atividade';
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

export function construirEdicaoFormativa(
  atual: DetalheFormativo,
  proximo: CadastroFormativo,
): EdicaoFormativa {
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
