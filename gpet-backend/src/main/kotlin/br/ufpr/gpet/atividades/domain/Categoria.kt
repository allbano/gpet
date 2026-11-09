package br.ufpr.gpet.atividades.domain

import br.ufpr.gpet.shared.domain.*
import java.util.UUID

data class Categoria(
    val id: UUID,
    val natureza: String,
    val nome: String,
    val descricao: String,
    val ativo: Boolean,
    val versao: Long,
) {
    init {
        validarNatureza(natureza)
        texto(nome, "Nome", 200)
        texto(descricao, "Descrição")
    }
}

interface RepositorioCategorias {
    fun categorias(
        paginacao: Paginacao,
        natureza: String? = null,
        somenteAtivas: Boolean = false
    ): Pagina<Categoria>

    fun categoria(id: UUID): Categoria?
    fun salvar(categoria: Categoria, autor: UUID, nova: Boolean): Categoria
    fun excluirCategoria(id: UUID, versao: Long, autor: UUID)
}
