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
