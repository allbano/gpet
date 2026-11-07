import { TestBed } from '@angular/core/testing';
import { AtividadeForm } from './atividade-form';
import { atividadeMock, categoriaMock, formatoMock } from '../../../../../testing/dados.mock';

describe('Formulário compartilhado de atividades', () => {
  function criar(edicao = false) {
    const f = TestBed.createComponent(AtividadeForm);
    f.componentRef.setInput('categorias', [
      categoriaMock,
      { ...categoriaMock, id: 'informativa', natureza: 'informativa' },
    ]);
    f.componentRef.setInput('formatos', [formatoMock]);
    if (edicao) f.componentRef.setInput('inicial', atividadeMock);
    f.detectChanges();
    return f;
  }
  it('troca rótulos e filtra categorias por natureza', () => {
    const f = criar();
    expect(f.nativeElement.querySelector('label[for="objetivo"]')).toBeTruthy();
    f.componentInstance.dados.update((a) => ({ ...a, natureza: 'formativa' }));
    f.detectChanges();
    expect(f.nativeElement.querySelector('label[for="descricao"]')).toBeTruthy();
    expect(f.componentInstance.categoriasVisiveis()).toEqual([categoriaMock]);
  });
  it('não emite formulário vazio e apresenta erros acessíveis', () => {
    const f = criar();
    const salvar = vi.fn();
    f.componentInstance.salvar.subscribe(salvar);
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    f.detectChanges();
    expect(salvar).not.toHaveBeenCalled();
    expect(f.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Informe o título',
    );
  });
  it('edita dados mock preservando carga horária textual', () => {
    const f = criar(true);
    const salvar = vi.fn();
    f.componentInstance.salvar.subscribe(salvar);
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        cargaHoraria: atividadeMock.cargaHoraria,
        descricao: atividadeMock.descricao,
      }),
    );
  });
  it('limpa categoria ao trocar natureza', () => {
    const f = criar(true);
    f.componentInstance.mudarNatureza();
    expect(f.componentInstance.dados().categoriaId).toBe('');
  });
  it('bloqueia novo envio enquanto salva', () => {
    const f = criar(true);
    f.componentRef.setInput('ocupado', true);
    const salvar = vi.fn();
    f.componentInstance.salvar.subscribe(salvar);
    f.componentInstance.enviar(new Event('submit'));
    expect(salvar).not.toHaveBeenCalled();
  });
});
