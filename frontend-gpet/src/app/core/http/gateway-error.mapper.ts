import { HttpErrorResponse } from '@angular/common/http';
import { GatewayError, GatewayErrorKind } from './gateway-error.model';

function extrairMensagemDoCorpo(errorBody: unknown): string | null {
  if (typeof errorBody === 'object' && errorBody !== null && 'mensagem' in errorBody) {
    const mensagem = (errorBody as { mensagem?: unknown }).mensagem;
    if (typeof mensagem === 'string' && mensagem.trim().length > 0) {
      return mensagem.trim();
    }
  }
  if (typeof errorBody === 'string' && errorBody.trim().length > 0) {
    return errorBody.trim();
  }
  return null;
}

function classificarStatus(status: number): { kind: GatewayErrorKind; padrao: string } {
  switch (status) {
    case 0:
      return {
        kind: 'network',
        padrao: 'Não foi possível conectar ao API Gateway. Verifique se o serviço está ativo.',
      };
    case 400:
    case 405:
      return { kind: 'bad_request', padrao: 'Parâmetros inválidos na requisição.' };
    case 404:
      return { kind: 'not_found', padrao: 'Recurso não encontrado.' };
    case 409:
      return { kind: 'conflict', padrao: 'Classificação em uso ou nome já cadastrado.' };
    case 422:
      return { kind: 'validation', padrao: 'Os dados informados violam uma regra do cadastro.' };
    case 502:
    case 503:
    case 504:
      return {
        kind: 'unavailable',
        padrao: 'Serviço temporariamente indisponível no API Gateway.',
      };
    default:
      return { kind: 'unknown', padrao: 'Falha inesperada ao comunicar com o serviço.' };
  }
}

export function mapHttpErrorToGatewayError(err: unknown): GatewayError {
  if (err instanceof HttpErrorResponse) {
    const { kind, padrao } = classificarStatus(err.status);
    const mensagemCorpo = err.status === 0 ? null : extrairMensagemDoCorpo(err.error);
    return {
      kind,
      status: err.status,
      mensagem: mensagemCorpo ?? padrao,
    };
  }

  if (isGatewayError(err)) {
    return err;
  }

  if (err instanceof Error && err.message.trim().length > 0) {
    return {
      kind: 'unknown',
      status: 0,
      mensagem: err.message.trim(),
    };
  }

  return {
    kind: 'unknown',
    status: 0,
    mensagem: 'Erro desconhecido ao processar a solicitação.',
  };
}

export function isGatewayError(value: unknown): value is GatewayError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    'status' in value &&
    'mensagem' in value
  );
}
