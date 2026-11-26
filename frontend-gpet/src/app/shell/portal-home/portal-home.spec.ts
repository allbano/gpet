import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_GATEWAY_BASE_URL } from '../../core/config/api-gateway.token';
import { PortalHome } from './portal-home';

describe('PortalHome', () => {
  let fixture: ComponentFixture<PortalHome>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalHome],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_GATEWAY_BASE_URL, useValue: '' },
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PortalHome);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('deve apresentar módulos separados de Formativas e Informativas e verificar prontidão via api_gateway', async () => {
    await fixture.whenStable();

    httpTesting.expectOne('/ready').flush(null, { status: 200, statusText: 'OK' });
    httpTesting.expectOne('/public/formativas/ready').flush(null, { status: 200, statusText: 'OK' });
    httpTesting
      .expectOne('/public/informativas/ready')
      .flush(null, { status: 200, statusText: 'OK' });

    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Atividades Formativas');
    expect(el.textContent).toContain('Atividades Informativas');
    expect(el.textContent).toContain('Online');
  });
});
