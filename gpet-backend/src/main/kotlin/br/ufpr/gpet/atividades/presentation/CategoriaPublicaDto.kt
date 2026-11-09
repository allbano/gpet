package br.ufpr.gpet.atividades.presentation

import org.eclipse.microprofile.openapi.annotations.media.Schema
import java.util.UUID

@Schema(description = "Categoria pública ativa, sem estado administrativo ou versão.")
data class CategoriaPublicaDto(
    @field:Schema(format = "uuid", required = true) val id: UUID,
    @field:Schema(enumeration = ["informativa", "formativa"], required = true) val natureza: String,
    @field:Schema(maxLength = 200, required = true) val nome: String,
    @field:Schema(maxLength = 10000, required = true) val descricao: String,
)
