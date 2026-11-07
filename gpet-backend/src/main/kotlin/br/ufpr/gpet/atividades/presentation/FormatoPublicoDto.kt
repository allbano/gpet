package br.ufpr.gpet.atividades.presentation

import br.ufpr.gpet.atividades.domain.*
import br.ufpr.gpet.shared.domain.*
import jakarta.ws.rs.*
import java.util.UUID

data class FormatoPublicoDto(
    val id: UUID,
    val nome: String,
    val descricao: String,
)
