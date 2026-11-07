import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Senha } from './senha';

describe('Troca de senha com dados mock', () => {
  function criar() {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(Senha);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
    return {
      componente: fixture.componentInstance,
      http: TestBed.inject(HttpTestingController),
      navegar,
    };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it.each([8, 64])(
    'aceita nova senha de %i caracteres e apaga os dados após salvar',
    async (tamanho) => {
      const { componente, http, navegar } = criar();
      const nova = 'a'.repeat(tamanho);
      componente.dados.set({ atual: 'senha antiga fictícia', nova, confirmacao: nova });
      const envio = componente.salvar(new Event('submit'));
      const requisicao = http.expectOne('/api/v1/auth/senha');
      expect(requisicao.request.body.novaSenha).toBe(nova);
      requisicao.flush(null);
      await envio;
      expect(navegar).toHaveBeenCalledWith('/gpet-admin/login');
      expect(componente.dados()).toEqual({ atual: '', nova: '', confirmacao: '' });
    },
  );

  it.each([7, 65])('bloqueia nova senha de %i caracteres sem chamar a API', async (tamanho) => {
    const { componente, http } = criar();
    const nova = 'a'.repeat(tamanho);
    componente.dados.set({ atual: 'senha antiga fictícia', nova, confirmacao: nova });
    await componente.salvar(new Event('submit'));
    http.expectNone('/api/v1/auth/senha');
  });

  it('bloqueia confirmação diferente da nova senha', async () => {
    const { componente, http } = criar();
    componente.dados.set({
      atual: 'senha antiga fictícia',
      nova: '12345678',
      confirmacao: '87654321',
    });
    await componente.salvar(new Event('submit'));
    http.expectNone('/api/v1/auth/senha');
    expect(componente.erro()).toContain('confirmação');
  });
});
