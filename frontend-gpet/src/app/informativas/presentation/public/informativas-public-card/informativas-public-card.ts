import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MeioBadge } from '../../../../shared/components/meio-badge/meio-badge';
import { CartaoInformativo } from '../../../domain/atividade-informativa.model';

@Component({
  selector: 'app-informativas-public-card',
  imports: [RouterLink, MeioBadge],
  templateUrl: './informativas-public-card.html',
  styleUrl: './informativas-public-card.css',
})
export class InformativasPublicCard {
  readonly cartao = input.required<CartaoInformativo>();
}
