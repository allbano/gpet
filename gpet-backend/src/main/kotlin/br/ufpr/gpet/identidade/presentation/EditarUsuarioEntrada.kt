package br.ufpr.gpet.identidade.presentation

import org.eclipse.microprofile.openapi.annotations.media.Schema

@Schema(description = "Edição de conta e versão esperada para concorrência otimista.")
data class EditarUsuarioEntrada(
    @field:Schema(minLength = 1, maxLength = 200, required = true) val nome: String,
    @field:Schema(minLength = 3, maxLength = 100, pattern = "[a-z0-9._-]{3,100}", required = true) val login: String,
    @field:Schema(required = true) val ativo: Boolean,
    @field:Schema(minimum = "0", required = true) val versao: Long,
)
