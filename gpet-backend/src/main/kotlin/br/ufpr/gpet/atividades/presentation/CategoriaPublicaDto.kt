package br.ufpr.gpet.atividades.presentation

import br.ufpr.gpet.atividades.domain.*
import br.ufpr.gpet.shared.domain.*
import jakarta.ws.rs.*
import java.util.UUID

data class CategoriaPublicaDto(
    val id: UUID,
    val natureza: String,
    val nome: String,
    val descricao: String,
)
