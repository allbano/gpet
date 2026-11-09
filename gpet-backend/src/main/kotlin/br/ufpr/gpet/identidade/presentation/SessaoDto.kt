package br.ufpr.gpet.identidade.presentation

import org.eclipse.microprofile.openapi.annotations.enums.SchemaType
import org.eclipse.microprofile.openapi.annotations.media.Schema
import java.time.Instant

@Schema(description = "Sessão e token CSRF. O cookie de autenticação não aparece no corpo JSON.")
data class SessaoDto(
    @field:Schema(required = true) val usuario: UsuarioDto,
    @field:Schema(description = "Token a enviar em X-CSRF-Token nas escritas autenticadas.", required = true, example = "token-csrf-ficticio") val csrfToken: String,
    @field:Schema(type = SchemaType.STRING, format = "date-time", required = true, example = "2026-11-09T20:00:00Z") val expiraEm: Instant,
)
