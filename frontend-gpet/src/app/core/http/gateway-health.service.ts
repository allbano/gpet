import { HttpClient } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_GATEWAY_BASE_URL, buildGatewayUrl } from '../config/api-gateway.token';

export type ReadinessStatus = 'checking' | 'online' | 'offline';

@Service()
export class GatewayHealthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_GATEWAY_BASE_URL);

  private readonly gatewaySignal = signal<ReadinessStatus>('checking');
  private readonly formativasSignal = signal<ReadinessStatus>('checking');
  private readonly informativasSignal = signal<ReadinessStatus>('checking');
  private readonly verificandoSignal = signal<boolean>(false);

  readonly gateway = this.gatewaySignal.asReadonly();
  readonly formativas = this.formativasSignal.asReadonly();
  readonly informativas = this.informativasSignal.asReadonly();
  readonly verificando = this.verificandoSignal.asReadonly();

  async verificarTodos(): Promise<void> {
    this.verificandoSignal.set(true);
    this.gatewaySignal.set('checking');
    this.formativasSignal.set('checking');
    this.informativasSignal.set('checking');

    const [gw, form, info] = await Promise.all([
      this.checar('/ready'),
      this.checar('/public/formativas/ready'),
      this.checar('/public/informativas/ready'),
    ]);

    this.gatewaySignal.set(gw);
    this.formativasSignal.set(form);
    this.informativasSignal.set(info);
    this.verificandoSignal.set(false);
  }

  private async checar(path: string): Promise<ReadinessStatus> {
    try {
      await firstValueFrom(this.http.get(buildGatewayUrl(this.baseUrl, path), { responseType: 'text' }));
      return 'online';
    } catch {
      return 'offline';
    }
  }
}
