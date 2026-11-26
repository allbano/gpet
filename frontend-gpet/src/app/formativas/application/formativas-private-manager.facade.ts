import { Service, inject, signal } from '@angular/core';
import { mapHttpErrorToGatewayError } from '../../core/http/gateway-error.mapper';
import { GatewayError } from '../../core/http/gateway-error.model';
import { NotificationStore } from '../../core/notifications/notification.store';
import { ATIVIDADE_FORMATIVA_REPOSITORY } from '../domain/atividade-formativa-repository.port';
import {
  CadastroFormativo,
  CartaoFormativo,
  DetalheFormativo,
  OcorrenciaFormativa,
  construirEdicaoFormativa,
} from '../domain/atividade-formativa.model';
import { EdicaoHorarioFormativo, HorarioFormativo } from '../domain/periodo-formativo.model';
import { TIPO_ATIVIDADE_REPOSITORY } from '../domain/tipo-atividade-repository.port';
import { TipoAtividade } from '../domain/tipo-atividade.model';

@Service({ autoProvided: false })
export class FormativasPrivateManagerFacade {
  private readonly atividadeRepo = inject(ATIVIDADE_FORMATIVA_REPOSITORY);
  private readonly tipoRepo = inject(TIPO_ATIVIDADE_REPOSITORY);
  private readonly notifications = inject(NotificationStore);

  private readonly cartoesSignal = signal<readonly CartaoFormativo[]>([]);
  private readonly proximoCursorSignal = signal<string | null>(null);
  private readonly limiteSignal = signal<number>(20);
  private readonly carregandoListaSignal = signal<boolean>(false);
  private readonly erroListaSignal = signal<GatewayError | null>(null);

  private readonly atividadeAtualSignal = signal<DetalheFormativo | null>(null);
  private readonly carregandoDetalheSignal = signal<boolean>(false);
  private readonly salvandoSignal = signal<boolean>(false);
  private readonly erroOperacaoSignal = signal<GatewayError | null>(null);

  private readonly salvandoPeriodoSignal = signal<boolean>(false);
  private readonly erroPeriodoSignal = signal<GatewayError | null>(null);

  private readonly tiposSignal = signal<readonly TipoAtividade[]>([]);
  private readonly carregandoTiposSignal = signal<boolean>(false);
  private readonly salvandoTipoSignal = signal<boolean>(false);
  private readonly erroTipoSignal = signal<GatewayError | null>(null);

  private readonly ocorrenciasSignal = signal<readonly OcorrenciaFormativa[]>([]);
  private readonly proximoCursorAgendaSignal = signal<string | null>(null);
  private readonly carregandoAgendaSignal = signal<boolean>(false);
  private readonly erroAgendaSignal = signal<GatewayError | null>(null);
  private ultimaJanela: { inicio: string; termino: string; limite: number } | null = null;

  readonly cartoes = this.cartoesSignal.asReadonly();
  readonly proximoCursor = this.proximoCursorSignal.asReadonly();
  readonly limite = this.limiteSignal.asReadonly();
  readonly carregandoLista = this.carregandoListaSignal.asReadonly();
  readonly erroLista = this.erroListaSignal.asReadonly();

  readonly atividadeAtual = this.atividadeAtualSignal.asReadonly();
  readonly carregandoDetalhe = this.carregandoDetalheSignal.asReadonly();
  readonly salvando = this.salvandoSignal.asReadonly();
  readonly erroOperacao = this.erroOperacaoSignal.asReadonly();

  readonly salvandoPeriodo = this.salvandoPeriodoSignal.asReadonly();
  readonly erroPeriodo = this.erroPeriodoSignal.asReadonly();

  readonly tipos = this.tiposSignal.asReadonly();
  readonly carregandoTipos = this.carregandoTiposSignal.asReadonly();
  readonly salvandoTipo = this.salvandoTipoSignal.asReadonly();
  readonly erroTipo = this.erroTipoSignal.asReadonly();

  readonly ocorrencias = this.ocorrenciasSignal.asReadonly();
  readonly proximoCursorAgenda = this.proximoCursorAgendaSignal.asReadonly();
  readonly carregandoAgenda = this.carregandoAgendaSignal.asReadonly();
  readonly erroAgenda = this.erroAgendaSignal.asReadonly();

  async carregarAtividades(): Promise<void> {
    this.carregandoListaSignal.set(true);
    this.erroListaSignal.set(null);
    try {
      const pagina = await this.atividadeRepo.listarPrivadas({ limite: this.limiteSignal() });
      this.cartoesSignal.set(pagina.itens);
      this.proximoCursorSignal.set(pagina.proximo_cursor);
    } catch (erro) {
      this.erroListaSignal.set(mapHttpErrorToGatewayError(erro));
    } finally {
      this.carregandoListaSignal.set(false);
    }
  }

  async carregarMaisAtividades(): Promise<void> {
    const cursor = this.proximoCursorSignal();
    if (!cursor || this.carregandoListaSignal()) {
      return;
    }
    this.carregandoListaSignal.set(true);
    this.erroListaSignal.set(null);
    try {
      const pagina = await this.atividadeRepo.listarPrivadas({
        limite: this.limiteSignal(),
        cursor,
      });
      this.cartoesSignal.update((atuais) => {
        const existentes = new Set(atuais.map((item) => item.id));
        return [...atuais, ...pagina.itens.filter((item) => !existentes.has(item.id))];
      });
      this.proximoCursorSignal.set(pagina.proximo_cursor);
    } catch (erro) {
      this.erroListaSignal.set(mapHttpErrorToGatewayError(erro));
    } finally {
      this.carregandoListaSignal.set(false);
    }
  }

  async alterarLimite(limite: number): Promise<void> {
    this.limiteSignal.set(limite);
    await this.carregarAtividades();
  }

  async carregarAtividade(id: string): Promise<void> {
    this.carregandoDetalheSignal.set(true);
    this.erroOperacaoSignal.set(null);
    try {
      const detalhe = await this.atividadeRepo.obterPrivadaPorId(id);
      this.atividadeAtualSignal.set(detalhe);
    } catch (erro) {
      this.atividadeAtualSignal.set(null);
      this.erroOperacaoSignal.set(mapHttpErrorToGatewayError(erro));
    } finally {
      this.carregandoDetalheSignal.set(false);
    }
  }

  limparAtividadeAtual(): void {
    this.atividadeAtualSignal.set(null);
    this.erroOperacaoSignal.set(null);
  }

  async criarAtividade(cadastro: CadastroFormativo): Promise<string | null> {
    this.salvandoSignal.set(true);
    this.erroOperacaoSignal.set(null);
    try {
      const { id } = await this.atividadeRepo.criar(cadastro);
      this.notifications.success('Atividade formativa criada com sucesso.');
      return id;
    } catch (erro) {
      const mapped = mapHttpErrorToGatewayError(erro);
      this.erroOperacaoSignal.set(mapped);
      this.notifications.error(mapped.mensagem);
      return null;
    } finally {
      this.salvandoSignal.set(false);
    }
  }

  async editarAtividade(
    id: string,
    atual: DetalheFormativo,
    proximo: CadastroFormativo,
  ): Promise<boolean> {
    const patch = construirEdicaoFormativa(atual, proximo);
    if (Object.keys(patch).length === 0) {
      this.notifications.info('Nenhuma alteração detectada.');
      return true;
    }

    this.salvandoSignal.set(true);
    this.erroOperacaoSignal.set(null);
    try {
      await this.atividadeRepo.editar(id, patch);
      const atualizado = await this.atividadeRepo.obterPrivadaPorId(id);
      this.atividadeAtualSignal.set(atualizado);
      this.notifications.success('Atividade formativa atualizada com sucesso.');
      return true;
    } catch (erro) {
      const mapped = mapHttpErrorToGatewayError(erro);
      this.erroOperacaoSignal.set(mapped);
      this.notifications.error(mapped.mensagem);
      return false;
    } finally {
      this.salvandoSignal.set(false);
    }
  }

  async excluirAtividade(id: string): Promise<boolean> {
    this.salvandoSignal.set(true);
    this.erroOperacaoSignal.set(null);
    try {
      await this.atividadeRepo.excluir(id);
      this.cartoesSignal.update((lista) => lista.filter((item) => item.id !== id));
      if (this.atividadeAtualSignal()?.id === id) {
        this.atividadeAtualSignal.set(null);
      }
      this.notifications.success('Atividade formativa excluída.');
      return true;
    } catch (erro) {
      const mapped = mapHttpErrorToGatewayError(erro);
      this.erroOperacaoSignal.set(mapped);
      this.notifications.error(mapped.mensagem);
      return false;
    } finally {
      this.salvandoSignal.set(false);
    }
  }

  async adicionarPeriodo(atividadeId: string, horario: HorarioFormativo): Promise<boolean> {
    this.salvandoPeriodoSignal.set(true);
    this.erroPeriodoSignal.set(null);
    try {
      await this.atividadeRepo.adicionarPeriodo(atividadeId, horario);
      const atualizado = await this.atividadeRepo.obterPrivadaPorId(atividadeId);
      this.atividadeAtualSignal.set(atualizado);
      this.notifications.success('Período adicionado à programação.');
      return true;
    } catch (erro) {
      const mapped = mapHttpErrorToGatewayError(erro);
      this.erroPeriodoSignal.set(mapped);
      this.notifications.error(mapped.mensagem);
      return false;
    } finally {
      this.salvandoPeriodoSignal.set(false);
    }
  }

  async editarPeriodo(
    atividadeId: string,
    periodoId: string,
    edicao: EdicaoHorarioFormativo,
  ): Promise<boolean> {
    this.salvandoPeriodoSignal.set(true);
    this.erroPeriodoSignal.set(null);
    try {
      await this.atividadeRepo.editarPeriodo(atividadeId, periodoId, edicao);
      const atualizado = await this.atividadeRepo.obterPrivadaPorId(atividadeId);
      this.atividadeAtualSignal.set(atualizado);
      this.notifications.success('Período atualizado.');
      return true;
    } catch (erro) {
      const mapped = mapHttpErrorToGatewayError(erro);
      this.erroPeriodoSignal.set(mapped);
      this.notifications.error(mapped.mensagem);
      return false;
    } finally {
      this.salvandoPeriodoSignal.set(false);
    }
  }

  async excluirPeriodo(atividadeId: string, periodoId: string): Promise<boolean> {
    this.salvandoPeriodoSignal.set(true);
    this.erroPeriodoSignal.set(null);
    try {
      await this.atividadeRepo.excluirPeriodo(atividadeId, periodoId);
      const atualizado = await this.atividadeRepo.obterPrivadaPorId(atividadeId);
      this.atividadeAtualSignal.set(atualizado);
      this.notifications.success('Período removido da programação.');
      return true;
    } catch (erro) {
      const mapped = mapHttpErrorToGatewayError(erro);
      this.erroPeriodoSignal.set(mapped);
      this.notifications.error(mapped.mensagem);
      return false;
    } finally {
      this.salvandoPeriodoSignal.set(false);
    }
  }

  async carregarTipos(): Promise<void> {
    this.carregandoTiposSignal.set(true);
    this.erroTipoSignal.set(null);
    try {
      const lista = await this.tipoRepo.listar();
      this.tiposSignal.set(lista);
    } catch (erro) {
      this.erroTipoSignal.set(mapHttpErrorToGatewayError(erro));
    } finally {
      this.carregandoTiposSignal.set(false);
    }
  }

  async criarTipo(nome: string): Promise<boolean> {
    this.salvandoTipoSignal.set(true);
    this.erroTipoSignal.set(null);
    try {
      await this.tipoRepo.criar(nome.trim());
      await this.carregarTipos();
      this.notifications.success('Tipo de atividade cadastrado.');
      return true;
    } catch (erro) {
      const mapped = mapHttpErrorToGatewayError(erro);
      this.erroTipoSignal.set(mapped);
      this.notifications.error(mapped.mensagem);
      return false;
    } finally {
      this.salvandoTipoSignal.set(false);
    }
  }

  async renomearTipo(id: string, nome: string): Promise<boolean> {
    this.salvandoTipoSignal.set(true);
    this.erroTipoSignal.set(null);
    try {
      await this.tipoRepo.renomear(id, nome.trim());
      await this.carregarTipos();
      this.notifications.success('Tipo de atividade atualizado.');
      return true;
    } catch (erro) {
      const mapped = mapHttpErrorToGatewayError(erro);
      this.erroTipoSignal.set(mapped);
      this.notifications.error(mapped.mensagem);
      return false;
    } finally {
      this.salvandoTipoSignal.set(false);
    }
  }

  async excluirTipo(id: string): Promise<boolean> {
    this.salvandoTipoSignal.set(true);
    this.erroTipoSignal.set(null);
    try {
      await this.tipoRepo.excluir(id);
      this.tiposSignal.update((lista) => lista.filter((item) => item.id !== id));
      this.notifications.success('Tipo de atividade excluído.');
      return true;
    } catch (erro) {
      const mapped = mapHttpErrorToGatewayError(erro);
      this.erroTipoSignal.set(mapped);
      this.notifications.error(mapped.mensagem);
      return false;
    } finally {
      this.salvandoTipoSignal.set(false);
    }
  }

  async consultarAgenda(inicio: string, termino: string, limite = 20): Promise<void> {
    this.ultimaJanela = { inicio, termino, limite };
    this.carregandoAgendaSignal.set(true);
    this.erroAgendaSignal.set(null);
    try {
      const pagina = await this.atividadeRepo.consultarAgenda({ inicio, termino, limite });
      this.ocorrenciasSignal.set(pagina.itens);
      this.proximoCursorAgendaSignal.set(pagina.proximo_cursor);
    } catch (erro) {
      this.erroAgendaSignal.set(mapHttpErrorToGatewayError(erro));
    } finally {
      this.carregandoAgendaSignal.set(false);
    }
  }

  async carregarMaisAgenda(): Promise<void> {
    const cursor = this.proximoCursorAgendaSignal();
    const janela = this.ultimaJanela;
    if (!cursor || !janela || this.carregandoAgendaSignal()) {
      return;
    }

    this.carregandoAgendaSignal.set(true);
    this.erroAgendaSignal.set(null);
    try {
      const pagina = await this.atividadeRepo.consultarAgenda({ ...janela, cursor });
      this.ocorrenciasSignal.update((atuais) => {
        const existentes = new Set(atuais.map((item) => item.periodo_id));
        return [...atuais, ...pagina.itens.filter((item) => !existentes.has(item.periodo_id))];
      });
      this.proximoCursorAgendaSignal.set(pagina.proximo_cursor);
    } catch (erro) {
      this.erroAgendaSignal.set(mapHttpErrorToGatewayError(erro));
    } finally {
      this.carregandoAgendaSignal.set(false);
    }
  }
}
