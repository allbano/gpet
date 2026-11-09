package br.ufpr.gpet.atividades.application

import br.ufpr.gpet.atividades.domain.*
import br.ufpr.gpet.shared.domain.*
import jakarta.enterprise.context.ApplicationScoped
import jakarta.transaction.Transactional
import java.time.LocalDate
import java.util.UUID

data class DadosAtividade(
    val natureza: String,
    val categoriaId: UUID,
    val formatoId: UUID,
    val titulo: String,
    val objetivo: String?,
    val descricao: String?,
    val cargaHoraria: String,
    val inicio: LocalDate,
    val fim: LocalDate,
    val publicoAlvo: String,
    val versao: Long,
) {
    fun dominio(id: UUID) = Atividade(
        id, natureza, categoriaId, formatoId, titulo.trim(), objetivo?.trim(), descricao?.trim(),
        cargaHoraria, Periodo(inicio, fim), publicoAlvo.trim(), versao
    )
}

data class DadosCategoria(
    val natureza: String,
    val nome: String,
    val descricao: String,
    val ativo: Boolean,
    val versao: Long,
) {
    fun dominio(id: UUID) = Categoria(id, natureza, nome.trim(), descricao.trim(), ativo, versao)
}

data class DadosFormato(
    val nome: String,
    val descricao: String,
    val ativo: Boolean,
    val versao: Long,
) {
    fun dominio(id: UUID) = Formato(id, nome.trim(), descricao.trim(), ativo, versao)
}

data class AtividadePublica(
    val atividade: Atividade,
    val categoriaNome: String,
    val formatoNome: String,
)

@ApplicationScoped
@Transactional
class GestaoAtividades(
    private val atividades: RepositorioAtividades,
    private val categorias: RepositorioCategorias,
    private val formatos: RepositorioFormatos,
) {
    fun atividades(paginacao: Paginacao, filtro: FiltroAtividade) = atividades.atividades(paginacao, filtro)

    fun atividade(id: UUID) = atividades.atividade(id) ?: ausente()

    fun atividadesPublicas(paginacao: Paginacao, filtro: FiltroAtividade): Pagina<AtividadePublica> {
        val resultado = atividades.atividades(paginacao, filtro)
        return Pagina(resultado.itens.map(::publica), resultado.total, resultado.pagina, resultado.tamanho)
    }

    fun atividadePublica(id: UUID) = publica(atividade(id))

    private fun publica(item: Atividade) = AtividadePublica(
        item,
        categorias.categoria(item.categoriaId)?.nome ?: "",
        formatos.formato(item.formatoId)?.nome ?: ""
    )

    fun categorias(paginacao: Paginacao, natureza: String? = null, somenteAtivas: Boolean = false): Pagina<Categoria> {
        natureza?.let(::validarNatureza)
        return categorias.categorias(paginacao, natureza, somenteAtivas)
    }

    fun categoria(id: UUID) = categorias.categoria(id) ?: ausente()

    fun formatos(paginacao: Paginacao, somenteAtivos: Boolean = false) = formatos.formatos(paginacao, somenteAtivos)

    fun formato(id: UUID) = formatos.formato(id) ?: ausente()

    fun criar(dados: DadosAtividade, autor: UUID) = salvar(dados.dominio(UUID.randomUUID()), autor, true)

    fun editar(id: UUID, dados: DadosAtividade, autor: UUID) = salvar(dados.dominio(id), autor, false)

    private fun salvar(item: Atividade, autor: UUID, nova: Boolean): Atividade {
        val anterior = if (nova) null else atividades.atividade(item.id) ?: ausente()
        if (anterior != null && anterior.versao != item.versao) conflito()
        item.validarCatalogos(categoria(item.categoriaId), formato(item.formatoId), anterior)
        return atividades.salvar(item, autor, nova)
    }

    fun criar(dados: DadosCategoria, autor: UUID) = categorias.salvar(dados.dominio(UUID.randomUUID()), autor, true)

    fun editar(id: UUID, dados: DadosCategoria, autor: UUID) = categorias.salvar(dados.dominio(id), autor, false)

    fun criar(dados: DadosFormato, autor: UUID) = formatos.salvar(dados.dominio(UUID.randomUUID()), autor, true)

    fun editar(id: UUID, dados: DadosFormato, autor: UUID) = formatos.salvar(dados.dominio(id), autor, false)

    fun excluirAtividade(id: UUID, versao: Long, autor: UUID) = atividades.excluirAtividade(id, versao, autor)

    fun excluirCategoria(id: UUID, versao: Long, autor: UUID) = categorias.excluirCategoria(id, versao, autor)

    fun excluirFormato(id: UUID, versao: Long, autor: UUID) = formatos.excluirFormato(id, versao, autor)
}
