import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_GATEWAY_BASE_URL } from '../../core/config/api-gateway.token';
import { ModalidadesGatewayHttpAdapter } from './modalidades-gateway-http.adapter';

describe('ModalidadesGatewayHttpAdapter', () => {
  let adapter: ModalidadesGatewayHttpAdapter;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_GATEWAY_BASE_URL, useValue: '' },
        ModalidadesGatewayHttpAdapter,
      ],
    });
    adapter = TestBed.inject(ModalidadesGatewayHttpAdapter);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('deve executar CRUD de modalidades em /private/informativas/modalidades', async () => {
    const listPromise = adapter.listar();
    httpTesting.expectOne('/private/informativas/modalidades').flush([{ id: 'm1', nome: 'Cartilha' }]);
    expect(await listPromise).toEqual([{ id: 'm1', nome: 'Cartilha' }]);

    const createPromise = adapter.criar('Boletim');
    const createReq = httpTesting.expectOne('/private/informativas/modalidades');
    expect(createReq.request.body).toEqual({ nome: 'Boletim' });
    createReq.flush({ id: 'm2' }, { status: 201, statusText: 'Created' });
    expect(await createPromise).toEqual({ id: 'm2' });

    const delPromise = adapter.excluir('m1');
    httpTesting
      .expectOne('/private/informativas/modalidades/m1')
      .flush({ mensagem: 'Classificação em uso' }, { status: 409, statusText: 'Conflict' });
    await expect(delPromise).rejects.toMatchObject({ kind: 'conflict', status: 409 });
  });
});
