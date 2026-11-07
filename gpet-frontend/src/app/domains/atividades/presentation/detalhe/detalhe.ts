import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Api, mensagemErro } from '../../../../shared/infrastructure/api';
import { PageLayout } from '../../../../shared/ui/page-layout/page-layout';
import { AtividadePublica } from '../../domain/atividade';

@Component({
  selector: 'app-detalhe-atividade',
  imports: [PageLayout, DatePipe, RouterLink],
  templateUrl: './detalhe.html',
  styleUrl: './detalhe.css',
})
export class Detalhe implements OnInit {
  private readonly api = inject(Api);
  private readonly route = inject(ActivatedRoute);
  readonly atividade = signal<AtividadePublica | null>(null);
  readonly erro = signal('');
  readonly carregando = signal(true);
  ngOnInit() {
    void this.carregar();
  }
  async carregar() {
    this.erro.set('');
    this.carregando.set(true);
    try {
      this.atividade.set(
        await firstValueFrom(
          this.api.detalhe<AtividadePublica>(
            'public/atividades',
            this.route.snapshot.paramMap.get('id') ?? '',
          ),
        ),
      );
    } catch (e) {
      this.erro.set(mensagemErro(e));
    } finally {
      this.carregando.set(false);
    }
  }
}
