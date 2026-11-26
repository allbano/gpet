import { InjectionToken } from '@angular/core';
import { IdentificadorInformativo } from './atividade-informativa.model';
import { Modalidade } from './modalidade.model';

export interface ModalidadeRepository {
  listar(): Promise<readonly Modalidade[]>;
  obterPorId(id: string): Promise<Modalidade>;
  criar(nome: string): Promise<IdentificadorInformativo>;
  renomear(id: string, nome: string): Promise<void>;
  excluir(id: string): Promise<void>;
}

export const MODALIDADE_REPOSITORY = new InjectionToken<ModalidadeRepository>(
  'MODALIDADE_REPOSITORY',
);
