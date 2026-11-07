package br.ufpr.gpet.identidade.presentation

import br.ufpr.gpet.shared.domain.*
import jakarta.ws.rs.*
import jakarta.ws.rs.core.*

data class LoginEntrada(val login: String, val senha: String)
