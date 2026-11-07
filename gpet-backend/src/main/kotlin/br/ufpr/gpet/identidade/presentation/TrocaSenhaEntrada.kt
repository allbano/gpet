package br.ufpr.gpet.identidade.presentation

import br.ufpr.gpet.shared.domain.*
import jakarta.ws.rs.*
import jakarta.ws.rs.core.*

data class TrocaSenhaEntrada(val senhaAtual: String, val novaSenha: String)
