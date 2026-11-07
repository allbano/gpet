package br.ufpr.gpet.atividades.presentation

import br.ufpr.gpet.atividades.domain.*
import br.ufpr.gpet.shared.domain.*
import jakarta.ws.rs.*
import java.util.UUID

data class FormatoEntrada(
    val nome: String,
    val descricao: String,
    val ativo: Boolean = true,
    val versao: Long = 0,
) {
    fun dominio(id: UUID) = Formato(id, nome.trim(), descricao.trim(), ativo, versao)
}
