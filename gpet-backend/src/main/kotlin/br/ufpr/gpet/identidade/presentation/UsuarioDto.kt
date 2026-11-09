package br.ufpr.gpet.identidade.presentation

import org.eclipse.microprofile.openapi.annotations.media.Schema
import java.util.UUID

@Schema(description = "Conta sem hash de senha ou dados de sessão.")
data class UsuarioDto(
    @field:Schema(format = "uuid", required = true) val id: UUID,
    @field:Schema(maxLength = 200, required = true) val nome: String,
    @field:Schema(maxLength = 100, required = true) val login: String,
    @field:Schema(required = true) val ativo: Boolean,
    @field:Schema(description = "Indica que a senha temporária precisa ser trocada.", required = true) val trocarSenha: Boolean,
    @field:Schema(description = "Versão para concorrência otimista.", minimum = "0", required = true) val versao: Long,
)
