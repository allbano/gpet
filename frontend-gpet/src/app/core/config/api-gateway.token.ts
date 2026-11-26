import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export const API_GATEWAY_BASE_URL = new InjectionToken<string>('API_GATEWAY_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiGatewayBaseUrl,
});

const PREFIXOS_GATEWAY_PERMITIDOS = ['/public/', '/private/', '/health', '/ready'] as const;

export function buildGatewayUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const permitido = PREFIXOS_GATEWAY_PERMITIDOS.some(
    (prefixo) => normalizedPath === prefixo || normalizedPath.startsWith(prefixo),
  );
  if (!permitido) {
    throw new Error(
      `Caminho não permitido fora do api_gateway: "${normalizedPath}". Utilize prefixos /public/, /private/, /health ou /ready.`,
    );
  }

  const trimmedBase = baseUrl.trim().replace(/\/+$/, '');
  return trimmedBase ? `${trimmedBase}${normalizedPath}` : normalizedPath;
}
