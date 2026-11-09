package br.ufpr.gpet.atividades.presentation

import org.eclipse.microprofile.openapi.annotations.media.Schema
import java.util.UUID

@Schema(description = "Formato administrativo com estado e versão.")
data class FormatoDto(
    @field:Schema(format = "uuid", required = true) val id: UUID,
    @field:Schema(maxLength = 200, required = true) val nome: String,
    @field:Schema(maxLength = 10000, required = true) val descricao: String,
    @field:Schema(required = true) val ativo: Boolean,
    @field:Schema(description = "Versão para concorrência otimista.", minimum = "0", required = true) val versao: Long,
)
