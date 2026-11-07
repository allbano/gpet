package br.ufpr.gpet.atividades.domain

import br.ufpr.gpet.shared.domain.*
import java.util.UUID

fun validarNatureza(natureza: String) =
    exigir(natureza in setOf("informativa", "formativa"), "Natureza inválida.")

fun texto(valor: String, campo: String, limite: Int = 10000) = exigir(
    valor.isNotBlank() && valor.length <= limite,
    "$campo é obrigatório e deve ter até $limite caracteres."
)

data class Atividade(
    val id: UUID, val natureza: String, val categoriaId: UUID, val formatoId: UUID,
    val titulo: String, val objetivo: String?, val descricao: String?, val cargaHoraria: String,
    val periodo: Periodo, val publicoAlvo: String, val versao: Long
) {
    init {
        validarNatureza(natureza)
        texto(titulo, "Título", 300)
        texto(
            cargaHoraria,
            "Carga horária",
            500
        )
        texto(publicoAlvo, "Público-alvo", 1000)
        exigir(versao >= 0, "Versão inválida.")
        if (natureza == "informativa") {
            texto(objetivo ?: "", "Objetivo")
            exigir(
                descricao == null,
                "Informativa não aceita descrição."
            )
        } else {
            texto(descricao ?: "", "Descrição")
            exigir(
                objetivo == null,
                "Formativa não aceita objetivo."
            )
        }
    }

    fun validarCatalogos(categoria: Categoria, formato: Formato, anterior: Atividade? = null) {
        exigir(
            categoria.id == categoriaId && categoria.natureza == natureza,
            "Categoria incompatível com a natureza."
        )
        exigir(formato.id == formatoId, "Formato incompatível.")
        exigir(categoria.ativo || anterior?.categoriaId == categoriaId, "Categoria desativada.")
        exigir(formato.ativo || anterior?.formatoId == formatoId, "Formato desativado.")
    }
}

interface RepositorioAtividades {
    fun categorias(
        paginacao: Paginacao,
        natureza: String? = null,
        somenteAtivas: Boolean = false
    ): Pagina<Categoria>

    fun categoria(id: UUID): Categoria?
    fun salvar(categoria: Categoria, autor: UUID, nova: Boolean): Categoria
    fun excluirCategoria(id: UUID, versao: Long, autor: UUID)
    fun formatos(paginacao: Paginacao, somenteAtivos: Boolean = false): Pagina<Formato>
    fun formato(id: UUID): Formato?
    fun salvar(formato: Formato, autor: UUID, novo: Boolean): Formato
    fun excluirFormato(id: UUID, versao: Long, autor: UUID)
    fun atividades(paginacao: Paginacao, filtro: FiltroAtividade): Pagina<Atividade>
    fun atividade(id: UUID): Atividade?
    fun salvar(atividade: Atividade, autor: UUID, nova: Boolean): Atividade
    fun excluirAtividade(id: UUID, versao: Long, autor: UUID)
}
