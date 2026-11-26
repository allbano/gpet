import { InjectionToken } from '@angular/core';
import {
  CadastroInformativo,
  CartaoInformativo,
  DetalheInformativo,
  EdicaoInformativa,
  IdentificadorInformativo,
  JanelaAgendaInformativa,
  OcorrenciaInformativa,
  PaginaInformativa,
  PaginacaoInformativa,
} from './atividade-informativa.model';
import {
  EdicaoHorarioInformativo,
  HorarioInformativo,
  PeriodoInformativo,
} from './periodo-informativo.model';

export interface AtividadeInformativaRepository {
  listarPublicas(paginacao: PaginacaoInformativa): Promise<PaginaInformativa<CartaoInformativo>>;
  obterPublicaPorId(id: string): Promise<DetalheInformativo>;

  listarPrivadas(paginacao: PaginacaoInformativa): Promise<PaginaInformativa<CartaoInformativo>>;
  obterPrivadaPorId(id: string): Promise<DetalheInformativo>;
  criar(cadastro: CadastroInformativo): Promise<IdentificadorInformativo>;
  editar(id: string, edicao: EdicaoInformativa): Promise<void>;
  excluir(id: string): Promise<void>;

  listarPeriodos(atividadeId: string): Promise<readonly PeriodoInformativo[]>;
  obterPeriodo(atividadeId: string, periodoId: string): Promise<PeriodoInformativo>;
  adicionarPeriodo(
    atividadeId: string,
    horario: HorarioInformativo,
  ): Promise<IdentificadorInformativo>;
  editarPeriodo(
    atividadeId: string,
    periodoId: string,
    edicao: EdicaoHorarioInformativo,
  ): Promise<void>;
  excluirPeriodo(atividadeId: string, periodoId: string): Promise<void>;

  consultarAgenda(janela: JanelaAgendaInformativa): Promise<PaginaInformativa<OcorrenciaInformativa>>;
}

export const ATIVIDADE_INFORMATIVA_REPOSITORY = new InjectionToken<AtividadeInformativaRepository>(
  'ATIVIDADE_INFORMATIVA_REPOSITORY',
);
