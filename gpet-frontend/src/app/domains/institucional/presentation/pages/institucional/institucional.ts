import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageLayout } from '../../../../../shared/ui/page-layout/page-layout';

@Component({
  selector: 'app-institucional',
  imports: [PageLayout, RouterLink],
  templateUrl: './institucional.html',
  styleUrl: './institucional.css',
})
export class Institucional {
  private readonly route = inject(ActivatedRoute);
  readonly titulo = this.route.snapshot.data['titulo'] as string;
  readonly mensagem =
    (this.route.snapshot.data['mensagem'] as string) ??
    'Ainda não há conteúdos publicados nesta seção.';
}
