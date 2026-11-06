package br.ufpr.gpet.shared.presentation

import br.ufpr.gpet.shared.domain.Falha
import jakarta.ws.rs.WebApplicationException
import jakarta.ws.rs.core.Response
import jakarta.ws.rs.ext.ExceptionMapper
import jakarta.ws.rs.ext.Provider
import org.jooq.exception.DataAccessException
import org.jboss.logging.Logger

@Provider

class ErrosHttp : ExceptionMapper<Exception> {
    override fun toResponse(exception: Exception): Response {
        val falha = when (exception) {
            is Falha -> exception
            is DataAccessException -> when (exception.sqlState()) {
                "23505" -> Falha(409, "duplicado", "Já existe um registro com esse nome ou login.")
                "23503" -> Falha(
                    409,
                    "referenciado",
                    "O registro possui referências ou uma associação inválida."
                )

                "23514", "22001" -> Falha(
                    400,
                    "validacao",
                    "Os dados violam uma regra de cadastro."
                )

                else -> Falha(500, "erro_interno", "Não foi possível concluir a operação.")
            }

            is WebApplicationException -> Falha(
                exception.response.status,
                "requisicao_invalida",
                if (exception.response.status == 404) "Recurso não encontrado." else "Requisição inválida."
            )

            is IllegalArgumentException -> Falha(400, "validacao", "Dados inválidos.")
            else -> Falha(500, "erro_interno", "Não foi possível concluir a operação.")
        }
        if (falha.status == 500) Logger.getLogger(ErrosHttp::class.java)
            .error("Falha ao processar requisição", exception)
        return Response.status(falha.status).entity(ErroHttp(falha.codigo, falha.message))
            .type("application/json").build()
    }
}
