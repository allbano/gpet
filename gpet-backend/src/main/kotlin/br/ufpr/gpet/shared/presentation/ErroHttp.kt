package br.ufpr.gpet.shared.presentation

import io.quarkus.runtime.annotations.RegisterForReflection

@RegisterForReflection

data class ErroHttp(val codigo: String, val mensagem: String)
