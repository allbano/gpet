package br.ufpr.gpet.identidade.domain

import br.ufpr.gpet.shared.domain.*
import java.time.Instant
import java.util.UUID

data class Sessao(
    val tokenHash: String,
    val usuarioId: UUID,
    val csrfToken: String,
    val expiraEm: Instant,
) {
    fun validaEm(agora: Instant) = agora.isBefore(expiraEm)
}
