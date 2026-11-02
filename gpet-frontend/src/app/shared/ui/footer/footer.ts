import { Component, input } from '@angular/core';

/** Rodapé institucional exibido no fim de todas as páginas. */
@Component({
  selector: 'app-footer',
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  readonly institution = input('Setor de Educação Profissional e Tecnológica - SEPT');
  readonly address = input('Rua Dr. Alcides Vieira Arcoverde, 1225 - Jardim das Américas, Curitiba - PR');
}

