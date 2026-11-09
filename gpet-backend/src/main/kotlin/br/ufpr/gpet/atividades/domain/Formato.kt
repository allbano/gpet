package br.ufpr.gpet.atividades.domain

import br.ufpr.gpet.shared.domain.*
import java.util.UUID

data class Formato(
    val id: UUID,
    val nome: String,
    val descricao: String,
    val ativo: Boolean,
    val versao: Long,
) {
    init {
        texto(nome, "Nome", 200)
        texto(descricao, "Descrição")
    }
}

interface RepositorioFormatos {
    fun formatos(paginacao: Paginacao, somenteAtivos: Boolean = false): Pagina<Formato>
    fun formato(id: UUID): Formato?
    fun salvar(formato: Formato, autor: UUID, novo: Boolean): Formato
    fun excluirFormato(id: UUID, versao: Long, autor: UUID)
}
