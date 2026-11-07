package br.ufpr.gpet.identidade.presentation

import br.ufpr.gpet.identidade.application.GestaoIdentidade
import br.ufpr.gpet.identidade.domain.*
import br.ufpr.gpet.shared.domain.Falha
import br.ufpr.gpet.shared.presentation.ErroHttp
import jakarta.annotation.Priority
import jakarta.enterprise.context.RequestScoped
import jakarta.ws.rs.Priorities
import jakarta.ws.rs.container.*
import jakarta.ws.rs.core.Response
import jakarta.ws.rs.ext.Provider
import java.security.MessageDigest

@RequestScoped

class IdentidadeAtual {
    lateinit var usuario: Usuario
    lateinit var sessao: Sessao
    lateinit var token: String
}

@Provider
@Priority(Priorities.AUTHENTICATION)
class SegurancaHttp(private val gestao: GestaoIdentidade, private val atual: IdentidadeAtual) :
    ContainerRequestFilter, ContainerResponseFilter {
    override fun filter(request: ContainerRequestContext) {
        val path = request.uriInfo.path.trimStart('/')
        val autenticado =
            path.startsWith("api/v1/admin/") || path == "api/v1/admin" || (path.startsWith("api/v1/auth/") && path != "api/v1/auth/login")
        if (!autenticado) return
        try {
            val token = request.cookies["GPET_SESSION"]?.value
            val (usuario, sessao) = gestao.autenticar(token)
            if (request.method !in setOf("GET", "HEAD", "OPTIONS")) {
                val csrf = request.getHeaderString("X-CSRF-Token") ?: ""
                if (!MessageDigest.isEqual(
                        csrf.toByteArray(),
                        sessao.csrfToken.toByteArray()
                    )
                ) throw Falha(403, "csrf_invalido", "Token CSRF inválido. Recarregue a página.")
            }
            if (usuario.trocarSenha && path.startsWith("api/v1/admin")) throw Falha(
                403,
                "troca_obrigatoria",
                "Troque a senha temporária antes de continuar."
            )
            atual.usuario = usuario
            atual.sessao = sessao
            atual.token = token!!
        } catch (f: Falha) {
            request.abortWith(
                Response.status(f.status).entity(ErroHttp(f.codigo, f.message))
                    .type("application/json").build()
            )
        }
    }

    override fun filter(request: ContainerRequestContext, response: ContainerResponseContext) {
        if (request.uriInfo.path.trimStart('/').startsWith("api/")) {
            response.headers.putSingle("Cache-Control", "no-store")
            response.headers.putSingle("X-Content-Type-Options", "nosniff")
        }
    }
}
