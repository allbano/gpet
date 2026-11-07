package br.ufpr.gpet.identidade.presentation

import br.ufpr.gpet.shared.domain.*
import jakarta.ws.rs.*
import jakarta.ws.rs.core.*
import java.time.Instant

data class SessaoDto(
    val usuario: UsuarioDto,
    val csrfToken: String,
    val expiraEm: Instant,
)
