export type GatewayErrorKind =
  | 'bad_request'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'unavailable'
  | 'network'
  | 'unknown';

export interface GatewayError {
  readonly kind: GatewayErrorKind;
  readonly status: number;
  readonly mensagem: string;
}
