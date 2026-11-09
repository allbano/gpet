package br.ufpr.gpet.shared.presentation

import io.quarkus.runtime.annotations.RegisterForReflection
import org.eclipse.microprofile.openapi.annotations.media.Schema

@RegisterForReflection
@Schema(description = "Erro estável da API. Falhas JAX-RS usam o código requisicao_invalida.")
data class ErroHttp(
    @field:Schema(description = "Código legível por cliente.", example = "validacao", required = true)
    val codigo: String,
    @field:Schema(description = "Mensagem destinada ao usuário.", example = "Dados inválidos.", required = true)
    val mensagem: String,
)
