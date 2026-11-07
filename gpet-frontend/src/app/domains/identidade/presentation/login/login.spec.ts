import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { sessaoMock } from '../../../../../testing/dados.mock';
import { Login } from './login';

describe('Login com dados mock', () => {
  function criar() {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(Login);
    const http = TestBed.inject(HttpTestingController);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
    return { fixture, componente: fixture.componentInstance, http, navegar };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('não envia credenciais vazias', async () => {
    const { componente, http } = criar();
    await componente.entrar(new Event('submit'));
    http.expectNone('/api/v1/auth/login');
  });

  it('envia credenciais, impede envio duplicado e apaga a senha após autenticar', async () => {
    const { componente, http, navegar } = criar();
    componente.dados.set({ login: 'pessoa', senha: 'senha fictícia' });
    const envio = componente.entrar(new Event('submit'));
    expect(componente.ocupado()).toBe(true);
    await componente.entrar(new Event('submit'));
    const requisicao = http.expectOne('/api/v1/auth/login');
    expect(requisicao.request.body).toEqual({ login: 'pessoa', senha: 'senha fictícia' });
    requisicao.flush(sessaoMock);
    await envio;
    expect(navegar).toHaveBeenCalledWith('/admin');
    expect(componente.dados().senha).toBe('');
    expect(componente.ocupado()).toBe(false);
  });

  it('direciona senha temporária para a troca obrigatória', async () => {
    const { componente, http, navegar } = criar();
    componente.dados.set({ login: 'pessoa', senha: 'senha temporária fictícia' });
    const envio = componente.entrar(new Event('submit'));
    http.expectOne('/api/v1/auth/login').flush({
      ...sessaoMock,
      usuario: { ...sessaoMock.usuario, trocarSenha: true },
    });
    await envio;
    expect(navegar).toHaveBeenCalledWith('/trocar-senha');
  });

  it('exibe erro acessível e permite tentar novamente após credenciais inválidas', async () => {
    const { fixture, componente, http, navegar } = criar();
    componente.dados.set({ login: 'pessoa', senha: 'senha incorreta fictícia' });
    const envio = componente.entrar(new Event('submit'));
    http
      .expectOne('/api/v1/auth/login')
      .flush(
        { codigo: 'credenciais_invalidas', mensagem: 'Usuário ou senha inválidos.' },
        { status: 401, statusText: 'Unauthorized' },
      );
    await envio;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Usuário ou senha inválidos.',
    );
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
  });
});
