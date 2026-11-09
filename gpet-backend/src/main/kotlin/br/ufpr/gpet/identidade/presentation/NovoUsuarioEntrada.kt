package br.ufpr.gpet.identidade.presentation

import org.eclipse.microprofile.openapi.annotations.media.Schema

@Schema(description = "Nova conta com senha temporária e troca obrigatória.")
data class NovoUsuarioEntrada(
    @field:Schema(minLength = 1, maxLength = 200, required = true, example = "Pessoa fictícia") val nome: String,
    @field:Schema(description = "De 3 a 100 letras minúsculas, números, pontos, hífens ou sublinhados.", minLength = 3, maxLength = 100, pattern = "[a-z0-9._-]{3,100}", required = true, example = "pessoa.ficticia") val login: String,
    @field:Schema(format = "password", minLength = 8, maxLength = 64, required = true, example = "senha temporaria ficticia") val senhaTemporaria: String,
)
