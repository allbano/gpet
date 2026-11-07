package br.ufpr.gpet.identidade.application

import br.ufpr.gpet.identidade.domain.*
import br.ufpr.gpet.shared.domain.*

data class LoginCriado(
    val token: String,
    val sessao: Sessao,
    val usuario: Usuario,
)
