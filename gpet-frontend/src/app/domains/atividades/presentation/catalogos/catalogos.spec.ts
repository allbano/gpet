import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { Catalogos } from './catalogos';
import { categoriaMock } from '../../../../../testing/dados.mock';

describe('Gestão de catálogos com HTTP mock', () => {
  function criar() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { recurso: 'categorias' } } } },
      ],
    });
    const f = TestBed.createComponent(Catalogos);
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/categorias?pagina=0').flush({ itens: [categoriaMock], total: 1 });
    return { f, http, c: f.componentInstance };
  }
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('lista categorias e preenche edição', async () => {
    const { f, c } = criar();
    await f.whenStable();
    c.abrir(categoriaMock);
    f.detectChanges();
    expect(c.dados().nome).toBe(categoriaMock.nome);
    expect(f.nativeElement.textContent).toContain(categoriaMock.nome);
  });
  it('mantém formulário e apresenta erro de unicidade', async () => {
    const { f, c, http } = criar();
    await f.whenStable();
    c.abrir(null);
    c.dados.set({
      nome: 'Duplicada',
      descricao: 'Teste',
      natureza: 'formativa',
      ativo: true,
      versao: 0,
    });
    const p = c.salvar(new Event('submit'));
    http.expectOne('/api/v1/admin/categorias').flush({}, { status: 409, statusText: 'Conflict' });
    await p;
    f.detectChanges();
    expect(c.aberto()).toBe(true);
    expect(f.nativeElement.querySelector('[role="alert"]').textContent).toContain('Recarregue');
  });
  it('mostra erro de rede sem perder o cadastro', async () => {
    const { f, c, http } = criar();
    await f.whenStable();
    const p = c.carregar();
    http.expectOne('/api/v1/admin/categorias?pagina=0').error(new ProgressEvent('error'));
    await p;
    expect(c.erro()).toContain('conectar');
    expect(c.carregando()).toBe(false);
  });
  it('não envia formulário obrigatório vazio', async () => {
    const { f, c, http } = criar();
    await f.whenStable();
    c.abrir(null);
    await c.salvar(new Event('submit'));
    http.expectNone('/api/v1/admin/categorias');
  });
});
