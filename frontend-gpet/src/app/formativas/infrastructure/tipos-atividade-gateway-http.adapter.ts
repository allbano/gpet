import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_GATEWAY_BASE_URL, buildGatewayUrl } from '../../core/config/api-gateway.token';
import { mapHttpErrorToGatewayError } from '../../core/http/gateway-error.mapper';
import { IdentificadorFormativo } from '../domain/atividade-formativa.model';
import { TipoAtividadeRepository } from '../domain/tipo-atividade-repository.port';
import { TipoAtividade } from '../domain/tipo-atividade.model';

@Service({ autoProvided: false })
export class TiposAtividadeGatewayHttpAdapter implements TipoAtividadeRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_GATEWAY_BASE_URL);

  async listar(): Promise<readonly TipoAtividade[]> {
    return this.executar(() =>
      firstValueFrom(
        this.http.get<readonly TipoAtividade[]>(
          buildGatewayUrl(this.baseUrl, '/private/formativas/tipos-atividade'),
        ),
      ),
    );
  }

  async obterPorId(id: string): Promise<TipoAtividade> {
    return this.executar(() =>
      firstValueFrom(
        this.http.get<TipoAtividade>(
          buildGatewayUrl(
            this.baseUrl,
            `/private/formativas/tipos-atividade/${encodeURIComponent(id)}`,
          ),
        ),
      ),
    );
  }

  async criar(nome: string): Promise<IdentificadorFormativo> {
    return this.executar(() =>
      firstValueFrom(
        this.http.post<IdentificadorFormativo>(
          buildGatewayUrl(this.baseUrl, '/private/formativas/tipos-atividade'),
          { nome },
        ),
      ),
    );
  }

  async renomear(id: string, nome: string): Promise<void> {
    await this.executar(() =>
      firstValueFrom(
        this.http.patch<void>(
          buildGatewayUrl(
            this.baseUrl,
            `/private/formativas/tipos-atividade/${encodeURIComponent(id)}`,
          ),
          { nome },
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
            `/private/formativas/tipos-atividade/${encodeURIComponent(id)}`,
          ),
        ),
      ),
    );
  }

  private async executar<T>(operacao: () => Promise<T>): Promise<T> {
    try {
      return await operacao();
    } catch (erro) {
      throw mapHttpErrorToGatewayError(erro);
    }
  }
}
