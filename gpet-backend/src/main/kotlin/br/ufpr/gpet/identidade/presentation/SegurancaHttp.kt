package br.ufpr.gpet.identidade.presentation

import br.ufpr.gpet.identidade.application.*
import br.ufpr.gpet.shared.domain.*
import br.ufpr.gpet.shared.presentation.ErrosHttp
import jakarta.annotation.Priority
import jakarta.ws.rs.Priorities
import jakarta.ws.rs.container.*
import jakarta.ws.rs.ext.Provider
import java.security.MessageDigest

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
                ) throw CsrfInvalido()
            }
            if (usuario.trocarSenha && path.startsWith("api/v1/admin")) throw TrocaObrigatoria()
            atual.usuario = usuario
            atual.sessao = sessao
            atual.token = token!!
        } catch (f: Falha) {
            request.abortWith(ErrosHttp.resposta(f))
        }
    }

    override fun filter(request: ContainerRequestContext, response: ContainerResponseContext) {
        if (request.uriInfo.path.trimStart('/').startsWith("api/")) {
            response.headers.putSingle("Cache-Control", "no-store")
            response.headers.putSingle("X-Content-Type-Options", "nosniff")
        }
    }
}
