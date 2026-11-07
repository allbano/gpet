package br.ufpr.gpet.identidade.presentation

import br.ufpr.gpet.shared.domain.*
import jakarta.ws.rs.*
import jakarta.ws.rs.core.*
import java.util.UUID

data class UsuarioDto(
    val id: UUID,
    val nome: String,
    val login: String,
    val ativo: Boolean,
    val trocarSenha: Boolean,
    val versao: Long,
)
