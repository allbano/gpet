import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { Auth } from './auth';
import { authGuard, senhaGuard } from './auth.guard';
import { sessaoMock } from '../../../../testing/dados.mock';

describe('Guards com sessão mock', () => {
  const carregar = vi.fn();
  beforeEach(() => {
    carregar.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: Auth, useValue: { carregar } }],
    });
  });
  const executar = (guard = authGuard) =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  const url = (valor: unknown) =>
    TestBed.inject(Router).serializeUrl(valor as ReturnType<Router['createUrlTree']>);
  it('visitante vai ao login', async () => {
    carregar.mockResolvedValue(null);
    expect(url(await executar())).toBe('/gpet-admin/login');
  });
  it('senha temporária exige troca', async () => {
    carregar.mockResolvedValue({
      ...sessaoMock,
      usuario: { ...sessaoMock.usuario, trocarSenha: true },
    });
    expect(url(await executar())).toBe('/trocar-senha');
  });
  it('conta autenticada acessa a administração', async () => {
    carregar.mockResolvedValue(sessaoMock);
    expect(await executar()).toBe(true);
  });
  it('permite troca para usuário com senha temporária', async () => {
    carregar.mockResolvedValue(sessaoMock);
    expect(await executar(senhaGuard)).toBe(true);
  });
  it('falha de conexão leva ao login com aviso', async () => {
    carregar.mockRejectedValue(new Error('offline'));
    expect(url(await executar())).toBe('/gpet-admin/login?erro=conexao');
  });
});
