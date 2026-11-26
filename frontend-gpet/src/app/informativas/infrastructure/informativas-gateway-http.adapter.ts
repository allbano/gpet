import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_GATEWAY_BASE_URL, buildGatewayUrl } from '../../core/config/api-gateway.token';
import { mapHttpErrorToGatewayError } from '../../core/http/gateway-error.mapper';
import { AtividadeInformativaRepository } from '../domain/atividade-informativa-repository.port';
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
} from '../domain/atividade-informativa.model';
import {
  EdicaoHorarioInformativo,
  HorarioInformativo,
  PeriodoInformativo,
} from '../domain/periodo-informativo.model';

@Service({ autoProvided: false })
export class InformativasGatewayHttpAdapter implements AtividadeInformativaRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_GATEWAY_BASE_URL);

  async listarPublicas(paginacao: PaginacaoInformativa): Promise<PaginaInformativa<CartaoInformativo>> {
    return this.executar(() =>
      firstValueFrom(
        this.http.get<PaginaInformativa<CartaoInformativo>>(
          buildGatewayUrl(this.baseUrl, '/public/informativas/atividades'),
          { params: this.construirParamsPaginacao(paginacao) },
        ),
      ),
    );
  }

  async obterPublicaPorId(id: string): Promise<DetalheInformativo> {
    return this.executar(() =>
      firstValueFrom(
        this.http.get<DetalheInformativo>(
          buildGatewayUrl(
            this.baseUrl,
            `/public/informativas/atividades/${encodeURIComponent(id)}`,
          ),
        ),
      ),
    );
  }

  async listarPrivadas(paginacao: PaginacaoInformativa): Promise<PaginaInformativa<CartaoInformativo>> {
    return this.executar(() =>
      firstValueFrom(
        this.http.get<PaginaInformativa<CartaoInformativo>>(
          buildGatewayUrl(this.baseUrl, '/private/informativas/atividades'),
          { params: this.construirParamsPaginacao(paginacao) },
        ),
      ),
    );
  }

  async obterPrivadaPorId(id: string): Promise<DetalheInformativo> {
    return this.executar(() =>
      firstValueFrom(
        this.http.get<DetalheInformativo>(
          buildGatewayUrl(
            this.baseUrl,
            `/private/informativas/atividades/${encodeURIComponent(id)}`,
          ),
        ),
      ),
    );
  }

  async criar(cadastro: CadastroInformativo): Promise<IdentificadorInformativo> {
    return this.executar(() =>
      firstValueFrom(
        this.http.post<IdentificadorInformativo>(
          buildGatewayUrl(this.baseUrl, '/private/informativas/atividades'),
          cadastro,
        ),
      ),
    );
  }

  async editar(id: string, edicao: EdicaoInformativa): Promise<void> {
    await this.executar(() =>
      firstValueFrom(
        this.http.patch<void>(
          buildGatewayUrl(
            this.baseUrl,
            `/private/informativas/atividades/${encodeURIComponent(id)}`,
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
            `/private/informativas/atividades/${encodeURIComponent(id)}`,
          ),
        ),
      ),
    );
  }

  async listarPeriodos(atividadeId: string): Promise<readonly PeriodoInformativo[]> {
    return this.executar(() =>
      firstValueFrom(
        this.http.get<readonly PeriodoInformativo[]>(
          buildGatewayUrl(
            this.baseUrl,
            `/private/informativas/atividades/${encodeURIComponent(atividadeId)}/periodos`,
          ),
        ),
      ),
    );
  }

  async obterPeriodo(atividadeId: string, periodoId: string): Promise<PeriodoInformativo> {
    return this.executar(() =>
      firstValueFrom(
        this.http.get<PeriodoInformativo>(
          buildGatewayUrl(
            this.baseUrl,
            `/private/informativas/atividades/${encodeURIComponent(atividadeId)}/periodos/${encodeURIComponent(periodoId)}`,
          ),
        ),
      ),
    );
  }

  async adicionarPeriodo(
    atividadeId: string,
    horario: HorarioInformativo,
  ): Promise<IdentificadorInformativo> {
    return this.executar(() =>
      firstValueFrom(
        this.http.post<IdentificadorInformativo>(
          buildGatewayUrl(
            this.baseUrl,
            `/private/informativas/atividades/${encodeURIComponent(atividadeId)}/periodos`,
          ),
          horario,
        ),
      ),
    );
  }

  async editarPeriodo(
    atividadeId: string,
    periodoId: string,
    edicao: EdicaoHorarioInformativo,
  ): Promise<void> {
    await this.executar(() =>
      firstValueFrom(
        this.http.patch<void>(
          buildGatewayUrl(
            this.baseUrl,
            `/private/informativas/atividades/${encodeURIComponent(atividadeId)}/periodos/${encodeURIComponent(periodoId)}`,
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
            `/private/informativas/atividades/${encodeURIComponent(atividadeId)}/periodos/${encodeURIComponent(periodoId)}`,
          ),
        ),
      ),
    );
  }

  async consultarAgenda(
    janela: JanelaAgendaInformativa,
  ): Promise<PaginaInformativa<OcorrenciaInformativa>> {
    const params = this.construirParamsPaginacao({
      limite: janela.limite,
      cursor: janela.cursor,
    })
      .set('inicio', janela.inicio)
      .set('termino', janela.termino);

    return this.executar(() =>
      firstValueFrom(
        this.http.get<PaginaInformativa<OcorrenciaInformativa>>(
          buildGatewayUrl(this.baseUrl, '/private/informativas/agenda'),
          { params },
        ),
      ),
    );
  }

  private construirParamsPaginacao(paginacao: PaginacaoInformativa): HttpParams {
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
