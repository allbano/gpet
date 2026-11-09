package br.ufpr.gpet.atividades.presentation

import org.eclipse.microprofile.openapi.annotations.enums.SchemaType
import org.eclipse.microprofile.openapi.annotations.media.Schema
import java.time.LocalDate
import java.util.UUID

@Schema(description = "Atividade administrativa, incluindo a versão de concorrência otimista.")
data class AtividadeDto(
    @field:Schema(type = SchemaType.STRING, format = "uuid", required = true) val id: UUID,
    @field:Schema(enumeration = ["informativa", "formativa"], required = true) val natureza: String,
    @field:Schema(format = "uuid", required = true) val categoriaId: UUID,
    @field:Schema(format = "uuid", required = true) val formatoId: UUID,
    @field:Schema(maxLength = 300, required = true) val titulo: String,
    @field:Schema(description = "Presente somente em atividade informativa.") val objetivo: String?,
    @field:Schema(description = "Presente somente em atividade formativa.") val descricao: String?,
    @field:Schema(maxLength = 500, required = true) val cargaHoraria: String,
    @field:Schema(type = SchemaType.STRING, format = "date", required = true) val inicio: LocalDate,
    @field:Schema(type = SchemaType.STRING, format = "date", required = true) val fim: LocalDate,
    @field:Schema(maxLength = 1000, required = true) val publicoAlvo: String,
    @field:Schema(description = "Versão esperada na próxima edição ou exclusão.", minimum = "0", required = true) val versao: Long,
)
