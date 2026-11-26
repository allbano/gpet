import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_GATEWAY_BASE_URL } from '../../core/config/api-gateway.token';
import { FormativasGatewayHttpAdapter } from './formativas-gateway-http.adapter';

describe('FormativasGatewayHttpAdapter', () => {
  let adapter: FormativasGatewayHttpAdapter;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_GATEWAY_BASE_URL, useValue: 'http://localhost:55569' },
        FormativasGatewayHttpAdapter,
      ],
    });
    adapter = TestBed.inject(FormativasGatewayHttpAdapter);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('deve consultar cartões e detalhe públicos exclusivamente pelo api_gateway', async () => {
    const listPromise = adapter.listarPublicas({ limite: 12, cursor: 'abc|123' });
    const listReq = httpTesting.expectOne(
      (req) =>
        req.url === 'http://localhost:55569/public/formativas/atividades' &&
        req.params.get('limite') === '12' &&
        req.params.get('cursor') === 'abc|123',
    );
    expect(listReq.request.method).toBe('GET');
    listReq.flush({ itens: [], proximo_cursor: null });
    expect(await listPromise).toEqual({ itens: [], proximo_cursor: null });

    const detailPromise = adapter.obterPublicaPorId('id-1');
    const detailReq = httpTesting.expectOne(
      'http://localhost:55569/public/formativas/atividades/id-1',
    );
    expect(detailReq.request.method).toBe('GET');
    detailReq.flush({
      id: 'id-1',
      classificacao: 'Minicurso',
      classificacao_id: 'c-1',
      meio: 'HIBRIDO',
      titulo: 'Minicurso',
      descricao: 'Resumo',
      conteudo: 'Completo',
      publico_alvo: 'Graduação',
      carga_horaria_minutos: 120,
      publicacao_publica: true,
      agenda_pesquisa: true,
      periodos: [],
    });
    const detalhe = await detailPromise;
    expect(detalhe.id).toBe('id-1');
  });

  it('deve executar CRUD de atividades e períodos pelas rotas privadas do api_gateway', async () => {
    const createPromise = adapter.criar({
      classificacao_id: 'tipo-1',
      meio: 'ONLINE',
      titulo: 'Oficina',
      descricao: 'Resumo',
      conteudo: '',
      publico_alvo: 'Todos',
      carga_horaria_minutos: null,
      publicacao_publica: false,
      agenda_pesquisa: false,
    });
    const createReq = httpTesting.expectOne('http://localhost:55569/private/formativas/atividades');
    expect(createReq.request.method).toBe('POST');
    createReq.flush({ id: 'ativ-1' }, { status: 201, statusText: 'Created' });
    expect(await createPromise).toEqual({ id: 'ativ-1' });

    const patchPromise = adapter.editar('ativ-1', { titulo: 'Oficina Atualizada' });
    const patchReq = httpTesting.expectOne(
      'http://localhost:55569/private/formativas/atividades/ativ-1',
    );
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual({ titulo: 'Oficina Atualizada' });
    patchReq.flush(null, { status: 204, statusText: 'No Content' });
    await patchPromise;

    const addPeriodoPromise = adapter.adicionarPeriodo('ativ-1', {
      inicio: '2026-12-07T11:00:00Z',
      termino: '2026-12-07T15:00:00Z',
      fuso: 'America/Sao_Paulo',
    });
    const addPeriodoReq = httpTesting.expectOne(
      'http://localhost:55569/private/formativas/atividades/ativ-1/periodos',
    );
    expect(addPeriodoReq.request.method).toBe('POST');
    addPeriodoReq.flush({ id: 'per-1' }, { status: 201, statusText: 'Created' });
    expect(await addPeriodoPromise).toEqual({ id: 'per-1' });

    const delPeriodoPromise = adapter.excluirPeriodo('ativ-1', 'per-1');
    const delPeriodoReq = httpTesting.expectOne(
      'http://localhost:55569/private/formativas/atividades/ativ-1/periodos/per-1',
    );
    expect(delPeriodoReq.request.method).toBe('DELETE');
    delPeriodoReq.flush(null, { status: 204, statusText: 'No Content' });
    await delPeriodoPromise;
  });

  it('deve consultar agenda e converter erros HTTP para GatewayError', async () => {
    const agendaPromise = adapter.consultarAgenda({
      inicio: '2026-12-07T00:00:00Z',
      termino: '2026-12-10T00:00:00Z',
      limite: 20,
    });
    const agendaReq = httpTesting.expectOne(
      (req) =>
        req.url === 'http://localhost:55569/private/formativas/agenda' &&
        req.params.get('inicio') === '2026-12-07T00:00:00Z' &&
        req.params.get('termino') === '2026-12-10T00:00:00Z',
    );
    agendaReq.flush({ itens: [], proximo_cursor: null });
    expect(await agendaPromise).toEqual({ itens: [], proximo_cursor: null });

    const errorPromise = adapter.obterPublicaPorId('ausente');
    httpTesting
      .expectOne('http://localhost:55569/public/formativas/atividades/ausente')
      .flush({ mensagem: 'Recurso não encontrado' }, { status: 404, statusText: 'Not Found' });

    await expect(errorPromise).rejects.toMatchObject({
      kind: 'not_found',
      status: 404,
      mensagem: 'Recurso não encontrado',
    });
  });
});
