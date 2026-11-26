import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_GATEWAY_BASE_URL, buildGatewayUrl } from '../../core/config/api-gateway.token';
import { mapHttpErrorToGatewayError } from '../../core/http/gateway-error.mapper';
import { IdentificadorInformativo } from '../domain/atividade-informativa.model';
import { ModalidadeRepository } from '../domain/modalidade-repository.port';
import { Modalidade } from '../domain/modalidade.model';

@Service({ autoProvided: false })
export class ModalidadesGatewayHttpAdapter implements ModalidadeRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_GATEWAY_BASE_URL);

  async listar(): Promise<readonly Modalidade[]> {
    return this.executar(() =>
      firstValueFrom(
        this.http.get<readonly Modalidade[]>(
          buildGatewayUrl(this.baseUrl, '/private/informativas/modalidades'),
        ),
      ),
    );
  }

  async obterPorId(id: string): Promise<Modalidade> {
    return this.executar(() =>
      firstValueFrom(
        this.http.get<Modalidade>(
          buildGatewayUrl(
            this.baseUrl,
            `/private/informativas/modalidades/${encodeURIComponent(id)}`,
          ),
        ),
      ),
    );
  }

  async criar(nome: string): Promise<IdentificadorInformativo> {
    return this.executar(() =>
      firstValueFrom(
        this.http.post<IdentificadorInformativo>(
          buildGatewayUrl(this.baseUrl, '/private/informativas/modalidades'),
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
            `/private/informativas/modalidades/${encodeURIComponent(id)}`,
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
            `/private/informativas/modalidades/${encodeURIComponent(id)}`,
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
