import { InjectionToken } from '@angular/core';
import { IdentificadorFormativo } from './atividade-formativa.model';
import { TipoAtividade } from './tipo-atividade.model';

export interface TipoAtividadeRepository {
  listar(): Promise<readonly TipoAtividade[]>;
  obterPorId(id: string): Promise<TipoAtividade>;
  criar(nome: string): Promise<IdentificadorFormativo>;
  renomear(id: string, nome: string): Promise<void>;
  excluir(id: string): Promise<void>;
}

export const TIPO_ATIVIDADE_REPOSITORY = new InjectionToken<TipoAtividadeRepository>(
  'TIPO_ATIVIDADE_REPOSITORY',
);
