package br.ufpr.gpet.identidade.presentation

import br.ufpr.gpet.identidade.application.GestaoIdentidade
import br.ufpr.gpet.identidade.domain.Usuario
import br.ufpr.gpet.shared.domain.*
import jakarta.enterprise.context.ApplicationScoped
import jakarta.ws.rs.*
import jakarta.ws.rs.core.*
import org.eclipse.microprofile.config.inject.ConfigProperty
import java.time.Clock
import java.time.Instant

// DTOs nunca expõem hash da senha nem identificador da sessão.
fun Usuario.dto() = UsuarioDto(id, nome, login, ativo, trocarSenha, versao)

@ApplicationScoped

class LimiteLogin(private val relogio: Clock) {
    private data class Tentativas(var quantidade: Int, val inicio: Instant)

    private val tentativas = mutableMapOf<String, Tentativas>()

    @Synchronized
    fun sucesso(login: String) {
        tentativas.remove(login.trim().lowercase(java.util.Locale.ROOT).take(100))
    }

    @Synchronized
    fun verificar(login: String) {
        val agora = relogio.instant()
        tentativas.entries.removeIf { it.value.inicio.plusSeconds(900) <= agora }
        // Limite global também impede contornar o controle com logins aleatórios e crescimento ilimitado.
        val global = tentativas.getOrPut("*") { Tentativas(0, agora) }
        if (global.quantidade >= 300) throw Falha(
            429,
            "limite_login",
            "Muitas tentativas. Aguarde quinze minutos."
        )
        global.quantidade++
        val chave = login.trim().lowercase(java.util.Locale.ROOT).take(100)
        val atual = tentativas.getOrPut(chave) { Tentativas(0, agora) }
        if (atual.quantidade >= 5) throw Falha(
            429,
            "limite_login",
            "Muitas tentativas. Aguarde quinze minutos."
        )
        atual.quantidade++
    }
}

@Path("/api/v1/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
class AuthResource(
    private val gestao: GestaoIdentidade,
    private val atual: IdentidadeAtual,
    private val limite: LimiteLogin,
    @ConfigProperty(
        name = "gpet.cookie-secure",
        defaultValue = "true"
    ) private val seguro: Boolean
) {
    private fun cookie(token: String, maxAge: Int) =
        NewCookie.Builder("GPET_SESSION").value(token).path("/").httpOnly(true).secure(seguro)
            .sameSite(NewCookie.SameSite.LAX).maxAge(maxAge).build()

    @POST
    @Path("login")
    fun login(entrada: LoginEntrada, @HeaderParam("X-GPET-Request") requisicao: String?): Response {
        exigir(requisicao == "1", "Cabeçalho de origem da aplicação obrigatório.")
        exigir(
            entrada.login.length <= 100 && entrada.senha.length <= 1024,
            "Credenciais inválidas."
        )
        limite.verificar(entrada.login)
        val login = gestao.login(entrada.login, entrada.senha)
        limite.sucesso(entrada.login)
        return Response.ok(
            SessaoDto(
                login.usuario.dto(),
                login.sessao.csrfToken,
                login.sessao.expiraEm
            )
        ).cookie(cookie(login.token, 28800)).build()
    }

    @GET
    @Path("sessao")
    fun sessao() = SessaoDto(atual.usuario.dto(), atual.sessao.csrfToken, atual.sessao.expiraEm)

    @POST
    @Path("logout")
    fun logout(): Response {
        gestao.logout(atual.token)
        return Response.noContent().cookie(cookie("", 0)).build()
    }

    @PUT
    @Path("senha")
    fun senha(entrada: TrocaSenhaEntrada): Response {
        gestao.trocarSenha(atual.usuario.id, entrada.senhaAtual, entrada.novaSenha)
        return Response.noContent().cookie(cookie("", 0)).build()
    }
}
