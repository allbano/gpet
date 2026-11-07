import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Usuarios } from './usuarios';
import { usuarioMock } from '../../../../../testing/dados.mock';

describe('Gestão de usuários com dados mock', () => {
  function criar() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const f = TestBed.createComponent(Usuarios);
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/usuarios?pagina=0').flush({ itens: [usuarioMock], total: 1 });
    return { f, http, c: f.componentInstance };
  }
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it.each([8, 64])('cria usuário com senha temporária de %i caracteres', async (tamanho) => {
    const { f, c, http } = criar();
    await f.whenStable();
    c.abrir(null);
    const senhaTemporaria = 'a'.repeat(tamanho);
    c.dados.update((dados) => ({
      ...dados,
      nome: 'Pessoa fictícia',
      login: 'pessoa',
      senhaTemporaria,
    }));
    const envio = c.salvar(new Event('submit'));
    const requisicao = http.expectOne('/api/v1/admin/usuarios');
    expect(requisicao.request.body.senhaTemporaria).toBe(senhaTemporaria);
    requisicao.flush(usuarioMock);
    await Promise.resolve();
    http.expectOne('/api/v1/admin/usuarios?pagina=0').flush({ itens: [usuarioMock], total: 1 });
    await envio;
  });
  it.each([7, 65])('não redefine senha temporária de %i caracteres', async (tamanho) => {
    const { f, c, http } = criar();
    await f.whenStable();
    c.abrirSenha(usuarioMock);
    c.senha.set({ senhaTemporaria: 'a'.repeat(tamanho) });
    await c.redefinirSenha(new Event('submit'));
    http.expectNone(`/api/v1/admin/usuarios/${usuarioMock.id}/senha`);
    expect(c.erro()).toContain('8 a 64');
  });
  it('edita nome sem exigir nova senha temporária', async () => {
    const { f, c, http } = criar();
    await f.whenStable();
    c.abrir(usuarioMock);
    c.dados.update((d) => ({ ...d, nome: 'Outro nome fictício' }));
    const p = c.salvar(new Event('submit'));
    const r = http.expectOne(`/api/v1/admin/usuarios/${usuarioMock.id}`);
    expect(r.request.body.senhaTemporaria).toBeUndefined();
    r.flush({ ...usuarioMock, versao: 1 });
    await Promise.resolve();
    http.expectOne('/api/v1/admin/usuarios?pagina=0').flush({ itens: [], total: 0 });
    await p;
  });
  it('redefinição usa endpoint de senha e versão', async () => {
    const { f, c, http } = criar();
    await f.whenStable();
    c.abrirSenha(usuarioMock);
    c.senha.set({ senhaTemporaria: 'senha temporaria ficticia' });
    const p = c.redefinirSenha(new Event('submit'));
    const r = http.expectOne(`/api/v1/admin/usuarios/${usuarioMock.id}/senha`);
    expect(r.request.body.versao).toBe(0);
    r.flush(usuarioMock);
    await Promise.resolve();
    http.expectOne('/api/v1/admin/usuarios?pagina=0').flush({ itens: [], total: 0 });
    await p;
    expect(c.senha().senhaTemporaria).toBe('');
  });
});
