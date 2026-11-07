package br.ufpr.gpet.atividades.presentation

import br.ufpr.gpet.atividades.domain.*
import br.ufpr.gpet.shared.domain.*
import jakarta.ws.rs.*
import java.time.LocalDate
import java.util.UUID

data class AtividadeDto(
    val id: UUID,
    val natureza: String,
    val categoriaId: UUID,
    val formatoId: UUID,
    val titulo: String,
    val objetivo: String?,
    val descricao: String?,
    val cargaHoraria: String,
    val inicio: LocalDate,
    val fim: LocalDate,
    val publicoAlvo: String,
    val versao: Long,
)
