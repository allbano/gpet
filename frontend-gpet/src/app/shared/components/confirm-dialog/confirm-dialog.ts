import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

let proximoConfirmDialogId = 0;

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  readonly aberto = input<boolean>(false);
  readonly titulo = input.required<string>();
  readonly mensagem = input.required<string>();
  readonly textoConfirmar = input('Confirmar');
  readonly textoCancelar = input('Cancelar');
  readonly variante = input<'danger' | 'primary'>('danger');
  readonly processando = input<boolean>(false);

  readonly confirmado = output<void>();
  readonly cancelado = output<void>();

  protected readonly titleId = `confirm-dialog-title-${++proximoConfirmDialogId}`;
  protected readonly descId = `confirm-dialog-desc-${proximoConfirmDialogId}`;

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialogEl');

  constructor() {
    effect(() => {
      const dialog = this.dialogRef()?.nativeElement;
      if (!dialog) {
        return;
      }
      if (this.aberto()) {
        if (!dialog.open) {
          dialog.returnValue = '';
          dialog.showModal();
        }
      } else if (dialog.open) {
        dialog.close();
      }
    });
  }

  protected aoFechar(): void {
    const dialog = this.dialogRef()?.nativeElement;
    if (!dialog) {
      return;
    }
    const escolha = dialog.returnValue;
    dialog.returnValue = '';
    if (escolha === 'confirm') {
      this.confirmado.emit();
    } else {
      this.cancelado.emit();
    }
  }

  protected fecharComEscolha(valor: 'confirm' | 'cancel'): void {
    const dialog = this.dialogRef()?.nativeElement;
    if (!dialog) {
      return;
    }
    dialog.close(valor);
  }
}
