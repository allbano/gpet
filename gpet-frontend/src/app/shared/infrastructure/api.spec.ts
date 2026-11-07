import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Api, mensagemErro } from './api';
import { Catalogo } from '../../domains/atividades/domain/atividade';
import { formatoMock } from '../../../testing/dados.mock';

describe('API de cadastros com servidor mock', () => {
  let api: Api;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(Api);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('envia filtros e omite valores vazios', () => {
    api.listar('public/atividades', { natureza: 'formativa', titulo: '', pagina: 0 }).subscribe();
    const r = http.expectOne((r) => r.url === '/api/v1/public/atividades');
    expect(r.request.params.get('natureza')).toBe('formativa');
    expect(r.request.params.has('titulo')).toBe(false);
    r.flush({ itens: [], total: 0 });
  });
  it('carrega todas as páginas do catálogo sem truncar em 100', async () => {
    const p = api.todos<Catalogo>('admin/formatos');
    http
      .expectOne('/api/v1/admin/formatos?pagina=0&tamanho=100')
      .flush({ itens: [formatoMock], total: 2 });
    await Promise.resolve();
    http
      .expectOne('/api/v1/admin/formatos?pagina=1&tamanho=100')
      .flush({ itens: [{ ...formatoMock, id: 'outro' }], total: 2 });
    expect(await p).toHaveLength(2);
  });
  it('preserva versão na exclusão', () => {
    api.excluir('admin/formatos', formatoMock.id, 4).subscribe();
    const r = http.expectOne(`/api/v1/admin/formatos/${formatoMock.id}?versao=4`);
    expect(r.request.method).toBe('DELETE');
    r.flush(null);
  });
  it('usa rota própria para redefinir senha', () => {
    api.editar('admin/usuarios', 'id', { versao: 1 }, 'senha').subscribe();
    const r = http.expectOne('/api/v1/admin/usuarios/id/senha');
    expect(r.request.method).toBe('PUT');
    r.flush({});
  });
  it('apresenta conflito e falha de conexão', () => {
    expect(mensagemErro(new HttpErrorResponse({ status: 409 }))).toContain('Recarregue');
    expect(mensagemErro(new HttpErrorResponse({ status: 0 }))).toContain('conectar');
  });
});
