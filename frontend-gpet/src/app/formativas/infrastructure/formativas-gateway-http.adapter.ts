import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_GATEWAY_BASE_URL, buildGatewayUrl } from '../../core/config/api-gateway.token';
import { mapHttpErrorToGatewayError } from '../../core/http/gateway-error.mapper';
import { AtividadeFormativaRepository } from '../domain/atividade-formativa-repository.port';
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
} from '../domain/atividade-formativa.model';
import {
  EdicaoHorarioFormativo,
  HorarioFormativo,
  PeriodoFormativo,
} from '../domain/periodo-formativo.model';

@Service({ autoProvided: false })
export class FormativasGatewayHttpAdapter implements AtividadeFormativaRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_GATEWAY_BASE_URL);

  async listarPublicas(paginacao: PaginacaoFormativa): Promise<PaginaFormativa<CartaoFormativo>> {
    return this.executar(() =>
      firstValueFrom(
        this.http.get<PaginaFormativa<CartaoFormativo>>(
          buildGatewayUrl(this.baseUrl, '/public/formativas/atividades'),
          { params: this.construirParamsPaginacao(paginacao) },
        ),
      ),
    );
  }

  async obterPublicaPorId(id: string): Promise<DetalheFormativo> {
    return this.executar(() =>
      firstValueFrom(
        this.http.get<DetalheFormativo>(
          buildGatewayUrl(this.baseUrl, `/public/formativas/atividades/${encodeURIComponent(id)}`),
        ),
      ),
    );
  }

  async listarPrivadas(paginacao: PaginacaoFormativa): Promise<PaginaFormativa<CartaoFormativo>> {
    return this.executar(() =>
      firstValueFrom(
        this.http.get<PaginaFormativa<CartaoFormativo>>(
          buildGatewayUrl(this.baseUrl, '/private/formativas/atividades'),
          { params: this.construirParamsPaginacao(paginacao) },
        ),
      ),
    );
  }

  async obterPrivadaPorId(id: string): Promise<DetalheFormativo> {
    return this.executar(() =>
      firstValueFrom(
        this.http.get<DetalheFormativo>(
          buildGatewayUrl(
            this.baseUrl,
            `/private/formativas/atividades/${encodeURIComponent(id)}`,
          ),
        ),
      ),
    );
  }

  async criar(cadastro: CadastroFormativo): Promise<IdentificadorFormativo> {
    return this.executar(() =>
      firstValueFrom(
        this.http.post<IdentificadorFormativo>(
          buildGatewayUrl(this.baseUrl, '/private/formativas/atividades'),
          cadastro,
        ),
      ),
    );
  }

  async editar(id: string, edicao: EdicaoFormativa): Promise<void> {
    await this.executar(() =>
      firstValueFrom(
        this.http.patch<void>(
          buildGatewayUrl(
            this.baseUrl,
            `/private/formativas/atividades/${encodeURIComponent(id)}`,
          ),
          edicao,
        ),
      ),
    );
  }

  async excluir(id: string): Promise<void> {
    await this.executar(() =>
      firstValueFrom(
        this.http.delete<void>(
          buildGatewayUrl(
            this.baseUrl,
            `/private/formativas/atividades/${encodeURIComponent(id)}`,
          ),
        ),
      ),
    );
  }

  async listarPeriodos(atividadeId: string): Promise<readonly PeriodoFormativo[]> {
    return this.executar(() =>
      firstValueFrom(
        this.http.get<readonly PeriodoFormativo[]>(
          buildGatewayUrl(
            this.baseUrl,
            `/private/formativas/atividades/${encodeURIComponent(atividadeId)}/periodos`,
          ),
        ),
      ),
    );
  }

  async obterPeriodo(atividadeId: string, periodoId: string): Promise<PeriodoFormativo> {
    return this.executar(() =>
      firstValueFrom(
        this.http.get<PeriodoFormativo>(
          buildGatewayUrl(
            this.baseUrl,
            `/private/formativas/atividades/${encodeURIComponent(atividadeId)}/periodos/${encodeURIComponent(periodoId)}`,
          ),
        ),
      ),
    );
  }

  async adicionarPeriodo(
    atividadeId: string,
    horario: HorarioFormativo,
  ): Promise<IdentificadorFormativo> {
    return this.executar(() =>
      firstValueFrom(
        this.http.post<IdentificadorFormativo>(
          buildGatewayUrl(
            this.baseUrl,
            `/private/formativas/atividades/${encodeURIComponent(atividadeId)}/periodos`,
          ),
          horario,
        ),
      ),
    );
  }

  async editarPeriodo(
    atividadeId: string,
    periodoId: string,
    edicao: EdicaoHorarioFormativo,
  ): Promise<void> {
    await this.executar(() =>
      firstValueFrom(
        this.http.patch<void>(
          buildGatewayUrl(
            this.baseUrl,
            `/private/formativas/atividades/${encodeURIComponent(atividadeId)}/periodos/${encodeURIComponent(periodoId)}`,
          ),
          edicao,
        ),
      ),
    );
  }

  async excluirPeriodo(atividadeId: string, periodoId: string): Promise<void> {
    await this.executar(() =>
      firstValueFrom(
        this.http.delete<void>(
          buildGatewayUrl(
            this.baseUrl,
            `/private/formativas/atividades/${encodeURIComponent(atividadeId)}/periodos/${encodeURIComponent(periodoId)}`,
          ),
        ),
      ),
    );
  }

  async consultarAgenda(
    janela: JanelaAgendaFormativa,
  ): Promise<PaginaFormativa<OcorrenciaFormativa>> {
    let params = this.construirParamsPaginacao({
      limite: janela.limite,
      cursor: janela.cursor,
    })
      .set('inicio', janela.inicio)
      .set('termino', janela.termino);

    return this.executar(() =>
      firstValueFrom(
        this.http.get<PaginaFormativa<OcorrenciaFormativa>>(
          buildGatewayUrl(this.baseUrl, '/private/formativas/agenda'),
          { params },
        ),
      ),
    );
  }

  private construirParamsPaginacao(paginacao: PaginacaoFormativa): HttpParams {
    let params = new HttpParams();
    if (paginacao.limite !== undefined) {
      params = params.set('limite', String(paginacao.limite));
    }
    if (paginacao.cursor) {
      params = params.set('cursor', paginacao.cursor);
    }
    return params;
  }

  private async executar<T>(operacao: () => Promise<T>): Promise<T> {
    try {
      return await operacao();
    } catch (erro) {
      throw mapHttpErrorToGatewayError(erro);
    }
  }
}
