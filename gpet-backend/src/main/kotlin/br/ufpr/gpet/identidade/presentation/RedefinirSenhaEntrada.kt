package br.ufpr.gpet.identidade.presentation

import org.eclipse.microprofile.openapi.annotations.media.Schema

@Schema(description = "Redefinição administrativa para uma senha temporária.")
data class RedefinirSenhaEntrada(
    @field:Schema(format = "password", minLength = 8, maxLength = 64, required = true) val senhaTemporaria: String,
    @field:Schema(description = "Versão para concorrência otimista.", minimum = "0", required = true) val versao: Long,
)
