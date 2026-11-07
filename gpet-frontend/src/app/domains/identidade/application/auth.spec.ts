import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Auth } from './auth';
import { SessaoStore } from './sessao-store';
import { segurancaInterceptor } from '../infrastructure/seguranca.interceptor';
import { sessaoMock } from '../../../../testing/dados.mock';

describe('Autenticação HTTP com dados mock', () => {
  let auth: Auth;
  let http: HttpTestingController;
  let store: SessaoStore;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([segurancaInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(Auth);
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(SessaoStore);
  });
  afterEach(() => http.verify());
  it('envia login e guarda apenas estado de sessão em memória', () => {
    auth.login('pessoa', 'senha ficticia').subscribe();
    const r = http.expectOne('/api/v1/auth/login');
    expect(r.request.body).toEqual({ login: 'pessoa', senha: 'senha ficticia' });
    expect(r.request.headers.get('X-GPET-Request')).toBe('1');
    r.flush(sessaoMock);
    expect(auth.sessao()).toEqual(sessaoMock);
  });
  it('envia CSRF no logout e limpa sessão após sucesso', () => {
    store.sessao.set(sessaoMock);
    auth.logout().subscribe();
    const r = http.expectOne('/api/v1/auth/logout');
    expect(r.request.headers.get('X-CSRF-Token')).toBe(sessaoMock.csrfToken);
    r.flush(null);
    expect(auth.sessao()).toBeNull();
  });
  it('restaura sessão após recarregar a página', async () => {
    const p = auth.carregar();
    http.expectOne('/api/v1/auth/sessao').flush(sessaoMock);
    expect(await p).toEqual(sessaoMock);
  });
  it('limpa sessão expirada sem esconder falhas de conexão', async () => {
    store.sessao.set(sessaoMock);
    const p = auth.carregar();
    http.expectOne('/api/v1/auth/sessao').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(await p).toBeNull();
    expect(store.sessao()).toBeNull();
    const falha = auth.carregar();
    const esperado = expect(falha).rejects.toBeTruthy();
    http.expectOne('/api/v1/auth/sessao').flush({}, { status: 500, statusText: 'Error' });
    await esperado;
  });
  it('troca senha e descarta a sessão revogada', () => {
    store.sessao.set(sessaoMock);
    auth.trocarSenha('senha antiga ficticia', 'nova senha ficticia').subscribe();
    const r = http.expectOne('/api/v1/auth/senha');
    expect(r.request.method).toBe('PUT');
    expect(r.request.headers.get('X-CSRF-Token')).toBe(sessaoMock.csrfToken);
    r.flush(null);
    expect(store.sessao()).toBeNull();
  });
});
