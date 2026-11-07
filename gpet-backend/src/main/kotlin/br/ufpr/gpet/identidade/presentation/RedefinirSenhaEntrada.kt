package br.ufpr.gpet.identidade.presentation

import br.ufpr.gpet.shared.domain.*
import jakarta.ws.rs.*

data class RedefinirSenhaEntrada(val senhaTemporaria: String, val versao: Long)
