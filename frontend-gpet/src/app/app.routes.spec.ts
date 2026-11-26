import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { API_GATEWAY_BASE_URL } from './core/config/api-gateway.token';

describe('App Routes', () => {
  let harness: RouterTestingHarness;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_GATEWAY_BASE_URL, useValue: '' },
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('deve carregar rota pública de formativas via lazy loading', async () => {
    await harness.navigateByUrl('/public/formativas');
    const req = httpTesting.expectOne('/public/formativas/atividades?limite=12');
    req.flush({ itens: [], proximo_cursor: null });
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.textContent).toContain('Atividades Formativas');
  });

  it('deve carregar rota pública de informativas via lazy loading', async () => {
    await harness.navigateByUrl('/public/informativas');
    const req = httpTesting.expectOne('/public/informativas/atividades?limite=12');
    req.flush({ itens: [], proximo_cursor: null });
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.textContent).toContain('Atividades Informativas');
  });

  it('deve carregar rota privada de formativas e informativas separadamente', async () => {
    await harness.navigateByUrl('/private/formativas/tipos-atividade');
    const reqTipo = httpTesting.expectOne('/private/formativas/tipos-atividade');
    reqTipo.flush([]);
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.textContent).toContain('Tipos de Atividade Formativa');

    await harness.navigateByUrl('/private/informativas/modalidades');
    const reqMod = httpTesting.expectOne('/private/informativas/modalidades');
    reqMod.flush([]);
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.textContent).toContain('Modalidades de Atividade Informativa');
  });

  it('deve renderizar página 404 para rotas inexistentes', async () => {
    await harness.navigateByUrl('/rota-inexistente');
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.textContent).toContain('Página não encontrada');
  });
});
