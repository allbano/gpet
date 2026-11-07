package br.ufpr.gpet.identidade.domain

import br.ufpr.gpet.shared.domain.*
import java.util.UUID

data class Usuario(
    val id: UUID,
    val nome: String,
    val login: String,
    val senhaHash: String,
    val ativo: Boolean,
    val trocarSenha: Boolean,
    val versao: Long,
) {
    init {
        exigir(
            nome.isNotBlank() && nome.length <= 200,
            "Nome é obrigatório e deve ter até 200 caracteres."
        )
        normalizarLogin(login)
    }
}
