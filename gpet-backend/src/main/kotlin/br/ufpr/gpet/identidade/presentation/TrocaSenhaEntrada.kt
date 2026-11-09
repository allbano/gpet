package br.ufpr.gpet.identidade.presentation

import org.eclipse.microprofile.openapi.annotations.media.Schema

@Schema(description = "Troca da própria senha; todas as sessões do usuário são revogadas.")
data class TrocaSenhaEntrada(
    @field:Schema(format = "password", maxLength = 1024, required = true) val senhaAtual: String,
    @field:Schema(format = "password", minLength = 8, maxLength = 64, required = true, example = "nova senha ficticia") val novaSenha: String,
)
