import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MeioBadge } from '../../../../shared/components/meio-badge/meio-badge';
import { CartaoFormativo } from '../../../domain/atividade-formativa.model';

@Component({
  selector: 'app-formativas-public-card',
  imports: [RouterLink, MeioBadge],
  templateUrl: './formativas-public-card.html',
  styleUrl: './formativas-public-card.css',
})
export class FormativasPublicCard {
  readonly cartao = input.required<CartaoFormativo>();
}
