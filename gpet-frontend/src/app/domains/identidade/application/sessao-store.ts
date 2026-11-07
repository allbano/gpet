import { Service, signal } from '@angular/core';
import { Sessao } from '../domain/identidade';

@Service()
export class SessaoStore {
  readonly sessao = signal<Sessao | null>(null);
}
