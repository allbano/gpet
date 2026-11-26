import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialog } from './confirm-dialog';

@Component({
  selector: 'app-host-confirm-test',
  imports: [ConfirmDialog],
  template: `
    <app-confirm-dialog
      [aberto]="aberto()"
      titulo="Excluir atividade?"
      mensagem="Esta ação removerá a atividade e suas sessões."
      textoConfirmar="Excluir"
      textoCancelar="Cancelar"
      (confirmado)="confirmacoes.update((v) => v + 1)"
      (cancelado)="cancelamentos.update((v) => v + 1)"
    />
  `,
})
class HostConfirmTest {
  readonly aberto = signal(false);
  readonly confirmacoes = signal(0);
  readonly cancelamentos = signal(0);
}

describe('ConfirmDialog', () => {
  let fixture: ComponentFixture<HostConfirmTest>;
  let host: HostConfirmTest;

  beforeAll(() => {
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      };
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function (this: HTMLDialogElement, returnValue?: string) {
        this.removeAttribute('open');
        if (returnValue !== undefined) {
          this.returnValue = returnValue;
        }
        this.dispatchEvent(new Event('close'));
      };
    }
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostConfirmTest],
    }).compileComponents();

    fixture = TestBed.createComponent(HostConfirmTest);
    host = fixture.componentInstance;
  });

  it('não deve duplicar atributos ARIA nativos do <dialog> e deve abrir quando aberto=true', async () => {
    await fixture.whenStable();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;

    expect(dialog.getAttribute('role')).toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBeNull();
    expect(dialog.hasAttribute('open')).toBe(false);

    host.aberto.set(true);
    await fixture.whenStable();

    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.textContent).toContain('Excluir atividade?');
  });

  it('deve emitir confirmado e limpar returnValue ao confirmar', async () => {
    host.aberto.set(true);
    await fixture.whenStable();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    const confirmBtn = fixture.nativeElement.querySelector(
      'button[data-action="confirm"]',
    ) as HTMLButtonElement;
    confirmBtn.click();
    await fixture.whenStable();

    expect(host.confirmacoes()).toBe(1);
    expect(dialog.returnValue).toBe('');
  });

  it('deve emitir cancelado ao fechar via Esc ou cancelar', async () => {
    host.aberto.set(true);
    await fixture.whenStable();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    const cancelBtn = fixture.nativeElement.querySelector(
      'button[data-action="cancel"]',
    ) as HTMLButtonElement;
    cancelBtn.click();
    await fixture.whenStable();

    expect(host.cancelamentos()).toBe(1);
    expect(dialog.returnValue).toBe('');
  });
});
