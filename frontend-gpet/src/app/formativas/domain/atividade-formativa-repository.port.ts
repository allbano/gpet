import { InjectionToken } from '@angular/core';
import {
  CadastroFormativo,
  CartaoFormativo,
  DetalheFormativo,
  EdicaoFormativa,
  IdentificadorFormativo,
  JanelaAgendaFormativa,
  OcorrenciaFormativa,
  PaginaFormativa,
  PaginacaoFormativa,
} from './atividade-formativa.model';
import {
  EdicaoHorarioFormativo,
  HorarioFormativo,
  PeriodoFormativo,
} from './periodo-formativo.model';

export interface AtividadeFormativaRepository {
  listarPublicas(paginacao: PaginacaoFormativa): Promise<PaginaFormativa<CartaoFormativo>>;
  obterPublicaPorId(id: string): Promise<DetalheFormativo>;

  listarPrivadas(paginacao: PaginacaoFormativa): Promise<PaginaFormativa<CartaoFormativo>>;
  obterPrivadaPorId(id: string): Promise<DetalheFormativo>;
  criar(cadastro: CadastroFormativo): Promise<IdentificadorFormativo>;
  editar(id: string, edicao: EdicaoFormativa): Promise<void>;
  excluir(id: string): Promise<void>;

  listarPeriodos(atividadeId: string): Promise<readonly PeriodoFormativo[]>;
  obterPeriodo(atividadeId: string, periodoId: string): Promise<PeriodoFormativo>;
  adicionarPeriodo(atividadeId: string, horario: HorarioFormativo): Promise<IdentificadorFormativo>;
  editarPeriodo(
    atividadeId: string,
    periodoId: string,
    edicao: EdicaoHorarioFormativo,
  ): Promise<void>;
  excluirPeriodo(atividadeId: string, periodoId: string): Promise<void>;

  consultarAgenda(janela: JanelaAgendaFormativa): Promise<PaginaFormativa<OcorrenciaFormativa>>;
}

export const ATIVIDADE_FORMATIVA_REPOSITORY = new InjectionToken<AtividadeFormativaRepository>(
  'ATIVIDADE_FORMATIVA_REPOSITORY',
);
