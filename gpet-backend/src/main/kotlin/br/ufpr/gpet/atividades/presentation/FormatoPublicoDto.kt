package br.ufpr.gpet.atividades.presentation

import org.eclipse.microprofile.openapi.annotations.media.Schema
import java.util.UUID

@Schema(description = "Formato público ativo, sem estado administrativo ou versão.")
data class FormatoPublicoDto(
    @field:Schema(format = "uuid", required = true) val id: UUID,
    @field:Schema(maxLength = 200, required = true) val nome: String,
    @field:Schema(maxLength = 10000, required = true) val descricao: String,
)
