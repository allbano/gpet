import { TestBed } from '@angular/core/testing';
import { API_GATEWAY_BASE_URL, buildGatewayUrl } from './api-gateway.token';

describe('API_GATEWAY_BASE_URL e buildGatewayUrl', () => {
  it('deve fornecer string vazia por padrão para uso com proxy em desenvolvimento', () => {
    TestBed.configureTestingModule({});
    const baseUrl = TestBed.inject(API_GATEWAY_BASE_URL);
    expect(baseUrl).toBe('');
  });

  it('deve montar URLs relativas do gateway sem barras duplicadas', () => {
    expect(buildGatewayUrl('', '/public/formativas/atividades')).toBe(
      '/public/formativas/atividades',
    );
    expect(buildGatewayUrl('', 'public/formativas/atividades')).toBe(
      '/public/formativas/atividades',
    );
  });

  it('deve montar URLs absolutas quando baseUrl for configurada', () => {
    expect(buildGatewayUrl('http://localhost:55569/', '/private/informativas/modalidades')).toBe(
      'http://localhost:55569/private/informativas/modalidades',
    );
    expect(buildGatewayUrl('https://gpet.ufpr.br', '/health')).toBe('https://gpet.ufpr.br/health');
    expect(buildGatewayUrl('https://gpet.ufpr.br', '/ready')).toBe('https://gpet.ufpr.br/ready');
  });

  it('deve rejeitar caminhos diretos para APIs internas sem passar pelo api_gateway', () => {
    expect(() => buildGatewayUrl('', '/api/v1/formativas/atividades')).toThrowError(
      /api_gateway/i,
    );
    expect(() => buildGatewayUrl('http://127.0.0.1:8081', '/atividades')).toThrowError(
      /api_gateway/i,
    );
  });
});
