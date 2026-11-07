package br.ufpr.gpet.identidade.presentation

import br.ufpr.gpet.shared.domain.*
import jakarta.ws.rs.*

data class EditarUsuarioEntrada(
    val nome: String,
    val login: String,
    val ativo: Boolean,
    val versao: Long,
)
