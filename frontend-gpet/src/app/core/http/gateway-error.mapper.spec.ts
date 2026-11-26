import { HttpErrorResponse } from '@angular/common/http';
import { mapHttpErrorToGatewayError } from './gateway-error.mapper';

describe('mapHttpErrorToGatewayError', () => {
  it('deve extrair mensagem JSON retornada pelo backend ou gateway', () => {
    const httpError = new HttpErrorResponse({
      status: 422,
      error: { mensagem: 'Para publicar, preencha o conteúdo' },
    });

    const mapped = mapHttpErrorToGatewayError(httpError);
    expect(mapped).toEqual({
      kind: 'validation',
      status: 422,
      mensagem: 'Para publicar, preencha o conteúdo',
    });
  });

  it('deve mapear status 409 como conflito com mensagem amigável', () => {
    const httpError = new HttpErrorResponse({
      status: 409,
      error: { mensagem: 'Classificação em uso ou nome já cadastrado' },
    });

    expect(mapHttpErrorToGatewayError(httpError)).toEqual({
      kind: 'conflict',
      status: 409,
      mensagem: 'Classificação em uso ou nome já cadastrado',
    });
  });

  it('deve mapear status 404 como recurso não encontrado', () => {
    const httpError = new HttpErrorResponse({
      status: 404,
      error: null,
    });

    expect(mapHttpErrorToGatewayError(httpError)).toEqual({
      kind: 'not_found',
      status: 404,
      mensagem: 'Recurso não encontrado.',
    });
  });

  it('deve mapear status 400 e 405 como bad_request', () => {
    const badReq = new HttpErrorResponse({ status: 400, error: { mensagem: 'Cursor inválido' } });
    expect(mapHttpErrorToGatewayError(badReq)).toEqual({
      kind: 'bad_request',
      status: 400,
      mensagem: 'Cursor inválido',
    });

    const notAllowed = new HttpErrorResponse({ status: 405, error: null });
    expect(mapHttpErrorToGatewayError(notAllowed).kind).toBe('bad_request');
  });

  it('deve mapear status 502, 503 e 504 como serviço indisponível', () => {
    for (const status of [502, 503, 504]) {
      const httpError = new HttpErrorResponse({ status, error: null });
      const mapped = mapHttpErrorToGatewayError(httpError);
      expect(mapped.kind).toBe('unavailable');
      expect(mapped.status).toBe(status);
    }
  });

  it('deve mapear status 0 como falha de conexão com o gateway', () => {
    const httpError = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });
    const mapped = mapHttpErrorToGatewayError(httpError);
    expect(mapped.kind).toBe('network');
    expect(mapped.status).toBe(0);
    expect(mapped.mensagem).toContain('API Gateway');
  });

  it('deve mapear erros desconhecidos sem quebrar', () => {
    const mapped = mapHttpErrorToGatewayError(new Error('Falha inesperada'));
    expect(mapped).toEqual({
      kind: 'unknown',
      status: 0,
      mensagem: 'Falha inesperada',
    });
  });
});
