import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Pagina } from '../domain/api.model';

export function mensagemErro(erro: unknown): string {
  if (erro instanceof HttpErrorResponse) {
    if (erro.status === 409)
      return 'O registro foi alterado ou já existe um cadastro com esses dados. Recarregue antes de tentar novamente.';
    const corpo: unknown = erro.error;
    if (
      corpo &&
      typeof corpo === 'object' &&
      'mensagem' in corpo &&
      typeof corpo.mensagem === 'string'
    )
      return corpo.mensagem;
    if (erro.status === 0) return 'Não foi possível conectar ao servidor. Tente novamente.';
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}
@Service()
export class Api {
  private readonly http = inject(HttpClient);
  listar<T>(recurso: string, filtros: Record<string, string | number> = {}) {
    const params = new HttpParams({
      fromObject: Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor !== '')),
    });
    return this.http.get<Pagina<T>>(`/api/v1/${recurso}`, { params });
  }
  detalhe<T>(recurso: string, id: string) {
    return this.http.get<T>(`/api/v1/${recurso}/${encodeURIComponent(id)}`);
  }
  criar<T>(recurso: string, dados: unknown) {
    return this.http.post<T>(`/api/v1/${recurso}`, dados);
  }
  editar<T>(recurso: string, id: string, dados: unknown, acao?: 'senha') {
    return this.http.put<T>(
      `/api/v1/${recurso}/${encodeURIComponent(id)}${acao ? '/' + acao : ''}`,
      dados,
    );
  }
  excluir(recurso: string, id: string, versao: number) {
    return this.http.delete<void>(`/api/v1/${recurso}/${encodeURIComponent(id)}`, {
      params: { versao },
    });
  }
  async todos<T>(recurso: string): Promise<T[]> {
    const itens: T[] = [];
    let pagina = 0;
    while (true) {
      const resposta = await firstValueFrom(this.listar<T>(recurso, { pagina, tamanho: 100 }));
      itens.push(...resposta.itens);
      if (itens.length >= resposta.total || resposta.itens.length === 0) return itens;
      pagina++;
    }
  }
}
