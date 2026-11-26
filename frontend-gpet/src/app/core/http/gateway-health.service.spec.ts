import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_GATEWAY_BASE_URL } from '../config/api-gateway.token';
import { GatewayHealthService } from './gateway-health.service';

describe('GatewayHealthService', () => {
  let service: GatewayHealthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_GATEWAY_BASE_URL, useValue: '' },
      ],
    });
    service = TestBed.inject(GatewayHealthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('deve consultar os endpoints de prontidão exclusivamente pelo api_gateway', async () => {
    const promise = service.verificarTodos();

    const reqGateway = httpTesting.expectOne('/ready');
    const reqFormativas = httpTesting.expectOne('/public/formativas/ready');
    const reqInformativas = httpTesting.expectOne('/public/informativas/ready');

    expect(reqGateway.request.method).toBe('GET');
    expect(reqFormativas.request.method).toBe('GET');
    expect(reqInformativas.request.method).toBe('GET');

    reqGateway.flush(null, { status: 200, statusText: 'OK' });
    reqFormativas.flush(null, { status: 200, statusText: 'OK' });
    reqInformativas.flush({ mensagem: 'Banco indisponível' }, { status: 503, statusText: 'Service Unavailable' });

    await promise;

    expect(service.gateway()).toBe('online');
    expect(service.formativas()).toBe('online');
    expect(service.informativas()).toBe('offline');
    expect(service.verificando()).toBe(false);
  });

  it('deve marcar tudo offline quando houver falha de rede', async () => {
    const promise = service.verificarTodos();

    httpTesting.expectOne('/ready').error(new ProgressEvent('error'));
    httpTesting.expectOne('/public/formativas/ready').error(new ProgressEvent('error'));
    httpTesting.expectOne('/public/informativas/ready').error(new ProgressEvent('error'));

    await promise;

    expect(service.gateway()).toBe('offline');
    expect(service.formativas()).toBe('offline');
    expect(service.informativas()).toBe('offline');
  });
});
