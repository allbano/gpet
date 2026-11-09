package br.ufpr.gpet.identidade.presentation

import org.eclipse.microprofile.openapi.annotations.media.Schema

@Schema(description = "Credenciais de login. Senhas antigas com menos de oito caracteres continuam aceitas.")
data class LoginEntrada(
    @field:Schema(minLength = 3, maxLength = 100, required = true, example = "usuario.ficticio") val login: String,
    @field:Schema(format = "password", maxLength = 1024, required = true, example = "senha ficticia") val senha: String,
)
