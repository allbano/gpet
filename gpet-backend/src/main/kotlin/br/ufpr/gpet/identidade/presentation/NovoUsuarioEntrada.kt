package br.ufpr.gpet.identidade.presentation

import br.ufpr.gpet.shared.domain.*
import jakarta.ws.rs.*

data class NovoUsuarioEntrada(
    val nome: String,
    val login: String,
    val senhaTemporaria: String,
)
