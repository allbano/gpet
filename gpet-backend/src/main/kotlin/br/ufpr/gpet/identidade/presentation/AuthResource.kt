package br.ufpr.gpet.identidade.presentation

import br.ufpr.gpet.identidade.application.*
import br.ufpr.gpet.identidade.domain.Usuario
import br.ufpr.gpet.shared.domain.*
import br.ufpr.gpet.shared.presentation.ErroHttp
import jakarta.ws.rs.*
import jakarta.ws.rs.core.*
import org.eclipse.microprofile.config.inject.ConfigProperty
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.enums.ParameterIn
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType
import org.eclipse.microprofile.openapi.annotations.headers.Header
import org.eclipse.microprofile.openapi.annotations.media.Content
import org.eclipse.microprofile.openapi.annotations.media.Schema
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirementsSet
import org.eclipse.microprofile.openapi.annotations.tags.Tag

private const val JSON = "application/json"

// DTOs nunca expõem hash da senha nem identificador da sessão.
fun Usuario.dto() = UsuarioDto(id, nome, login, ativo, trocarSenha, versao)

@Path("/api/v1/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Autenticação")
class AuthResource(
    private val gestao: GestaoIdentidade,
    private val atual: IdentidadeAtual,
    private val limite: LimiteLogin,
    @ConfigProperty(name = "gpet.cookie-secure", defaultValue = "true") private val seguro: Boolean
) {
    private fun cookie(token: String, maxAge: Int) =
        NewCookie.Builder("GPET_SESSION").value(token).path("/").httpOnly(true).secure(seguro)
            .sameSite(NewCookie.SameSite.LAX).maxAge(maxAge).build()

    @POST
    @Path("login")
    @Operation(summary = "Autenticar", description = "Cria uma sessão de oito horas e devolve o token CSRF. Requer X-GPET-Request: 1.")
    @APIResponse(
        responseCode = "200", description = "Sessão criada; Set-Cookie contém GPET_SESSION com Path=/, HttpOnly, SameSite=Lax, Max-Age=28800 e Secure conforme o ambiente.",
        content = [Content(mediaType = JSON, schema = Schema(implementation = SessaoDto::class))],
        headers = [Header(name = "Set-Cookie", description = "Cookie GPET_SESSION; o valor é deliberadamente omitido dos exemplos.", schema = Schema(type = SchemaType.STRING))]
    )
    @APIResponse(responseCode = "400", description = "Payload/cabeçalho inválido (validacao ou requisicao_invalida).", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    @APIResponse(responseCode = "401", description = "Credenciais inválidas.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    @APIResponse(responseCode = "429", description = "Limite de tentativas excedido.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun login(
        entrada: LoginEntrada,
        @HeaderParam("X-GPET-Request")
        @Parameter(name = "X-GPET-Request", `in` = ParameterIn.HEADER, required = true, description = "Deve ser exatamente 1.", schema = Schema(type = SchemaType.STRING, enumeration = ["1"], example = "1"))
        requisicao: String?
    ): Response {
        exigir(requisicao == "1", "Cabeçalho de origem da aplicação obrigatório.")
        exigir(entrada.login.length <= 100 && entrada.senha.length <= 1024, "Credenciais inválidas.")
        limite.verificar(entrada.login)
        val login = gestao.login(entrada.login, entrada.senha)
        limite.sucesso(entrada.login)
        return Response.ok(SessaoDto(login.usuario.dto(), login.sessao.csrfToken, login.sessao.expiraEm))
            .cookie(cookie(login.token, 28800)).build()
    }

    @GET
    @Path("sessao")
    @Operation(summary = "Consultar sessão", description = "Retorna o usuário atual e seu token CSRF.")
    @SecurityRequirement(name = "GPET_SESSION")
    @APIResponse(responseCode = "200", description = "Sessão válida.")
    @APIResponse(responseCode = "401", description = "Sessão ausente ou expirada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun sessao() = SessaoDto(atual.usuario.dto(), atual.sessao.csrfToken, atual.sessao.expiraEm)

    @POST
    @Path("logout")
    @Operation(summary = "Encerrar sessão", description = "Revoga a sessão atual e limpa o cookie com Max-Age=0.")
    @SecurityRequirementsSet(SecurityRequirement(name = "GPET_SESSION"), SecurityRequirement(name = "X-CSRF-Token"))
    @APIResponse(
        responseCode = "204", description = "Sessão revogada; sem corpo.",
        headers = [Header(name = "Set-Cookie", description = "GPET_SESSION vazio com Path=/, HttpOnly, SameSite=Lax e Max-Age=0.", schema = Schema(type = SchemaType.STRING))]
    )
    @APIResponse(responseCode = "401", description = "Sessão ausente ou expirada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    @APIResponse(responseCode = "403", description = "Token CSRF inválido.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun logout(): Response {
        gestao.logout(atual.token)
        return Response.noContent().cookie(cookie("", 0)).build()
    }

    @PUT
    @Path("senha")
    @Operation(summary = "Trocar a própria senha", description = "Exige senha atual, revoga todas as sessões e limpa o cookie com Max-Age=0.")
    @SecurityRequirementsSet(SecurityRequirement(name = "GPET_SESSION"), SecurityRequirement(name = "X-CSRF-Token"))
    @APIResponse(
        responseCode = "204", description = "Senha alterada; sem corpo.",
        headers = [Header(name = "Set-Cookie", description = "GPET_SESSION vazio com Path=/, HttpOnly, SameSite=Lax e Max-Age=0.", schema = Schema(type = SchemaType.STRING))]
    )
    @APIResponse(responseCode = "400", description = "Nova senha inválida, igual à atual ou payload inválido.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    @APIResponse(responseCode = "401", description = "Sessão ou senha atual inválida.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    @APIResponse(responseCode = "403", description = "Token CSRF inválido.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun senha(entrada: TrocaSenhaEntrada): Response {
        gestao.trocarSenha(atual.usuario.id, entrada.senhaAtual, entrada.novaSenha)
        return Response.noContent().cookie(cookie("", 0)).build()
    }
}
