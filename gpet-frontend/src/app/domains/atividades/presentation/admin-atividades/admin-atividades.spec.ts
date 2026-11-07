import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminAtividades } from './admin-atividades';
import { atividadeMock, categoriaMock, formatoMock } from '../../../../../testing/dados.mock';

describe('Atividades administrativas com servidor mock', () => {
  it('preserva edição e informa conflito 409', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const f = TestBed.createComponent(AdminAtividades);
    f.detectChanges();
    const c = f.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/atividades?pagina=0').flush({ itens: [atividadeMock], total: 1 });
    http
      .expectOne('/api/v1/admin/categorias?pagina=0&tamanho=100')
      .flush({ itens: [categoriaMock], total: 1 });
    http
      .expectOne('/api/v1/admin/formatos?pagina=0&tamanho=100')
      .flush({ itens: [formatoMock], total: 1 });
    await f.whenStable();
    c.abrir(atividadeMock);
    const p = c.salvar({
      ...atividadeMock,
      objetivo: '',
      descricao: atividadeMock.descricao ?? '',
    });
    const r = http.expectOne(`/api/v1/admin/atividades/${atividadeMock.id}`);
    expect(r.request.body.objetivo).toBeNull();
    r.flush({}, { status: 409, statusText: 'Conflict' });
    await p;
    expect(c.editar()).toBe(true);
    expect(c.erro()).toContain('Recarregue');
    expect(c.ocupado()).toBe(false);
    http.verify();
  });
});
