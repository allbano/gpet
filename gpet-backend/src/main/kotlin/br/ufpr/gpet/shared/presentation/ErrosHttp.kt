package br.ufpr.gpet.shared.presentation

import br.ufpr.gpet.shared.domain.*
import jakarta.ws.rs.WebApplicationException
import jakarta.ws.rs.core.Response
import jakarta.ws.rs.ext.ExceptionMapper
import jakarta.ws.rs.ext.Provider
import org.jboss.logging.Logger

@Provider
class ErrosHttp : ExceptionMapper<Exception> {
    private data class Detalhe(val status: Int, val codigo: String, val mensagem: String)

    companion object {
        private val logger = Logger.getLogger(ErrosHttp::class.java)

        fun resposta(exception: Exception): Response {
            val detalhe = when (exception) {
                is Validacao -> Detalhe(400, "validacao", exception.message)
                is NaoEncontrado -> Detalhe(404, "nao_encontrado", exception.message)
                is Conflito -> Detalhe(409, "conflito", exception.message)
                is Duplicado -> Detalhe(409, "duplicado", exception.message)
                is LoginDuplicado -> Detalhe(409, "login_duplicado", exception.message)
                is Referenciado -> Detalhe(409, "referenciado", exception.message)
                is CredenciaisInvalidas -> Detalhe(401, "credenciais_invalidas", exception.message)
                is NaoAutenticado -> Detalhe(401, "nao_autenticado", exception.message)
                is CsrfInvalido -> Detalhe(403, "csrf_invalido", exception.message)
                is TrocaObrigatoria -> Detalhe(403, "troca_obrigatoria", exception.message)
                is LimiteLoginExcedido -> Detalhe(429, "limite_login", exception.message)
                is ErroInterno -> Detalhe(500, "erro_interno", exception.message)
                is WebApplicationException -> Detalhe(
                    exception.response.status,
                    "requisicao_invalida",
                    if (exception.response.status == 404) "Recurso não encontrado." else "Requisição inválida."
                )
                is IllegalArgumentException -> Detalhe(400, "validacao", "Dados inválidos.")
                else -> Detalhe(500, "erro_interno", "Não foi possível concluir a operação.")
            }
            if (detalhe.status == 500) logger.error("Falha ao processar requisição", exception)
            return Response.status(detalhe.status).entity(ErroHttp(detalhe.codigo, detalhe.mensagem))
                .type("application/json").build()
        }
    }

    override fun toResponse(exception: Exception): Response = resposta(exception)
}
