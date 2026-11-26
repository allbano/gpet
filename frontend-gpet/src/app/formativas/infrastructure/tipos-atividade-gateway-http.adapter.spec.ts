import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_GATEWAY_BASE_URL } from '../../core/config/api-gateway.token';
import { TiposAtividadeGatewayHttpAdapter } from './tipos-atividade-gateway-http.adapter';

describe('TiposAtividadeGatewayHttpAdapter', () => {
  let adapter: TiposAtividadeGatewayHttpAdapter;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_GATEWAY_BASE_URL, useValue: '' },
        TiposAtividadeGatewayHttpAdapter,
      ],
    });
    adapter = TestBed.inject(TiposAtividadeGatewayHttpAdapter);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('deve listar, criar, renomear e excluir tipos em /private/formativas/tipos-atividade', async () => {
    const listPromise = adapter.listar();
    const listReq = httpTesting.expectOne('/private/formativas/tipos-atividade');
    expect(listReq.request.method).toBe('GET');
    listReq.flush([{ id: 't1', nome: 'Minicurso' }]);
    expect(await listPromise).toEqual([{ id: 't1', nome: 'Minicurso' }]);

    const createPromise = adapter.criar('Oficina');
    const createReq = httpTesting.expectOne('/private/formativas/tipos-atividade');
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual({ nome: 'Oficina' });
    createReq.flush({ id: 't2' }, { status: 201, statusText: 'Created' });
    expect(await createPromise).toEqual({ id: 't2' });

    const patchPromise = adapter.renomear('t2', 'Oficina Prática');
    const patchReq = httpTesting.expectOne('/private/formativas/tipos-atividade/t2');
    expect(patchReq.request.method).toBe('PATCH');
    patchReq.flush(null, { status: 204, statusText: 'No Content' });
    await patchPromise;

    const delPromise = adapter.excluir('t2');
    httpTesting
      .expectOne('/private/formativas/tipos-atividade/t2')
      .flush({ mensagem: 'Classificação em uso' }, { status: 409, statusText: 'Conflict' });

    await expect(delPromise).rejects.toMatchObject({
      kind: 'conflict',
      status: 409,
    });
  });
});
