import { Service, inject, signal } from '@angular/core';
import { mapHttpErrorToGatewayError } from '../../core/http/gateway-error.mapper';
import { GatewayError } from '../../core/http/gateway-error.model';
import { ATIVIDADE_FORMATIVA_REPOSITORY } from '../domain/atividade-formativa-repository.port';
import { CartaoFormativo, DetalheFormativo } from '../domain/atividade-formativa.model';

@Service({ autoProvided: false })
export class FormativasPublicCatalogFacade {
  private readonly repository = inject(ATIVIDADE_FORMATIVA_REPOSITORY);

  private readonly cartoesSignal = signal<readonly CartaoFormativo[]>([]);
  private readonly proximoCursorSignal = signal<string | null>(null);
  private readonly limiteSignal = signal<number>(12);
  private readonly carregandoListaSignal = signal<boolean>(false);
  private readonly erroListaSignal = signal<GatewayError | null>(null);

  private readonly detalheSignal = signal<DetalheFormativo | null>(null);
  private readonly carregandoDetalheSignal = signal<boolean>(false);
  private readonly erroDetalheSignal = signal<GatewayError | null>(null);

  readonly cartoes = this.cartoesSignal.asReadonly();
  readonly proximoCursor = this.proximoCursorSignal.asReadonly();
  readonly limite = this.limiteSignal.asReadonly();
  readonly carregandoLista = this.carregandoListaSignal.asReadonly();
  readonly erroLista = this.erroListaSignal.asReadonly();

  readonly detalhe = this.detalheSignal.asReadonly();
  readonly carregandoDetalhe = this.carregandoDetalheSignal.asReadonly();
  readonly erroDetalhe = this.erroDetalheSignal.asReadonly();

  async carregarPrimeiraPagina(): Promise<void> {
    this.carregandoListaSignal.set(true);
    this.erroListaSignal.set(null);

    try {
      const pagina = await this.repository.listarPublicas({ limite: this.limiteSignal() });
      this.cartoesSignal.set(pagina.itens);
      this.proximoCursorSignal.set(pagina.proximo_cursor);
    } catch (erro) {
      this.erroListaSignal.set(mapHttpErrorToGatewayError(erro));
    } finally {
      this.carregandoListaSignal.set(false);
    }
  }

  async carregarMais(): Promise<void> {
    const cursor = this.proximoCursorSignal();
    if (!cursor || this.carregandoListaSignal()) {
      return;
    }

    this.carregandoListaSignal.set(true);
    this.erroListaSignal.set(null);

    try {
      const pagina = await this.repository.listarPublicas({
        limite: this.limiteSignal(),
        cursor,
      });
      this.cartoesSignal.update((atuais) => {
        const existentes = new Set(atuais.map((item) => item.id));
        const novos = pagina.itens.filter((item) => !existentes.has(item.id));
        return [...atuais, ...novos];
      });
      this.proximoCursorSignal.set(pagina.proximo_cursor);
    } catch (erro) {
      this.erroListaSignal.set(mapHttpErrorToGatewayError(erro));
    } finally {
      this.carregandoListaSignal.set(false);
    }
  }

  async alterarLimite(novoLimite: number): Promise<void> {
    this.limiteSignal.set(novoLimite);
    await this.carregarPrimeiraPagina();
  }

  async carregarDetalhe(id: string): Promise<void> {
    this.carregandoDetalheSignal.set(true);
    this.erroDetalheSignal.set(null);

    try {
      const detalhe = await this.repository.obterPublicaPorId(id);
      this.detalheSignal.set(detalhe);
    } catch (erro) {
      this.detalheSignal.set(null);
      this.erroDetalheSignal.set(mapHttpErrorToGatewayError(erro));
    } finally {
      this.carregandoDetalheSignal.set(false);
    }
  }

  limparDetalhe(): void {
    this.detalheSignal.set(null);
    this.erroDetalheSignal.set(null);
  }
}
