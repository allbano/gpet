import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_GATEWAY_BASE_URL } from '../../core/config/api-gateway.token';
import { InformativasGatewayHttpAdapter } from './informativas-gateway-http.adapter';

describe('InformativasGatewayHttpAdapter', () => {
  let adapter: InformativasGatewayHttpAdapter;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_GATEWAY_BASE_URL, useValue: 'http://localhost:55569' },
        InformativasGatewayHttpAdapter,
      ],
    });
    adapter = TestBed.inject(InformativasGatewayHttpAdapter);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('deve consultar rotas públicas e privadas de informativas via api_gateway', async () => {
    const pubPromise = adapter.listarPublicas({ limite: 20 });
    const pubReq = httpTesting.expectOne(
      (req) =>
        req.url === 'http://localhost:55569/public/informativas/atividades' &&
        req.params.get('limite') === '20',
    );
    expect(pubReq.request.method).toBe('GET');
    pubReq.flush({ itens: [], proximo_cursor: null });
    expect(await pubPromise).toEqual({ itens: [], proximo_cursor: null });

    const createPromise = adapter.criar({
      classificacao_id: 'mod-1',
      meio: 'IMPRESSO',
      titulo: 'Cartilha',
      descricao: 'Resumo',
      conteudo: 'Texto',
      publico_alvo: 'Comunidade',
      carga_horaria_minutos: null,
      publicacao_publica: true,
      agenda_pesquisa: false,
    });
    const createReq = httpTesting.expectOne(
      'http://localhost:55569/private/informativas/atividades',
    );
    expect(createReq.request.method).toBe('POST');
    createReq.flush({ id: 'info-1' }, { status: 201, statusText: 'Created' });
    expect(await createPromise).toEqual({ id: 'info-1' });

    const agendaPromise = adapter.consultarAgenda({
      inicio: '2026-12-01T00:00:00Z',
      termino: '2026-12-31T00:00:00Z',
    });
    const agendaReq = httpTesting.expectOne(
      (req) => req.url === 'http://localhost:55569/private/informativas/agenda',
    );
    agendaReq.flush({ itens: [], proximo_cursor: null });
    expect(await agendaPromise).toEqual({ itens: [], proximo_cursor: null });
  });
});
