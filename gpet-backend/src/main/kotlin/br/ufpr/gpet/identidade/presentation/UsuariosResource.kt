package br.ufpr.gpet.identidade.presentation

import br.ufpr.gpet.identidade.application.*
import br.ufpr.gpet.shared.domain.*
import br.ufpr.gpet.shared.presentation.ErroHttp
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType
import org.eclipse.microprofile.openapi.annotations.media.Content
import org.eclipse.microprofile.openapi.annotations.media.Schema
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter
import org.eclipse.microprofile.openapi.annotations.parameters.RequestBody
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirementsSet
import org.eclipse.microprofile.openapi.annotations.tags.Tag
import java.util.UUID

private const val JSON = "application/json"

@Path("/api/v1/admin/usuarios")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Usuários")
@SecurityRequirement(name = "GPET_SESSION")
@APIResponses(
    APIResponse(responseCode = "400", description = "Parâmetro ou payload inválido (validacao ou requisicao_invalida).", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))]),
    APIResponse(responseCode = "401", description = "Sessão ausente ou expirada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))]),
    APIResponse(responseCode = "403", description = "CSRF inválido em escritas ou troca de senha obrigatória em qualquer operação administrativa.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
)
class UsuariosResource(private val gestao: GestaoIdentidade, private val atual: IdentidadeAtual) {
    @GET
    @Operation(summary = "Listar usuários", description = "Lista paginada de contas, ordenada por login.")
    @APIResponse(responseCode = "200", description = "Página de usuários.")
    fun listar(
        @QueryParam("pagina") @DefaultValue("0")
        @Parameter(description = "Página entre 0 e 1000000.", schema = Schema(type = SchemaType.INTEGER, defaultValue = "0", minimum = "0", maximum = "1000000"))
        pagina: Int,
        @QueryParam("tamanho") @DefaultValue("20")
        @Parameter(description = "Itens por página, entre 1 e 100.", schema = Schema(type = SchemaType.INTEGER, defaultValue = "20", minimum = "1", maximum = "100"))
        tamanho: Int
    ): Pagina<UsuarioDto> {
        val resultado = gestao.usuarios(Paginacao(pagina, tamanho))
        return Pagina(resultado.itens.map { it.dto() }, resultado.total, pagina, tamanho)
    }

    @GET
    @Path("{id}")
    @Operation(summary = "Detalhar usuário")
    @APIResponse(responseCode = "200", description = "Conta encontrada.")
    @APIResponse(responseCode = "404", description = "Conta não encontrada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun detalhe(@PathParam("id") id: UUID) = gestao.usuario(id).dto()

    @POST
    @Operation(summary = "Criar usuário", description = "Cria conta ativa com senha temporária e troca obrigatória.")
    @SecurityRequirementsSet(SecurityRequirement(name = "GPET_SESSION"), SecurityRequirement(name = "X-CSRF-Token"))
    @APIResponse(responseCode = "200", description = "Conta criada.")
    @APIResponse(responseCode = "409", description = "Login duplicado ou conflito de persistência.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun criar(@RequestBody(description = "Nome, login e senha temporária.", required = true) entrada: NovoUsuarioEntrada) =
        gestao.criar(entrada.nome, entrada.login, entrada.senhaTemporaria, atual.usuario.id).dto()

    @PUT
    @Path("{id}")
    @Operation(summary = "Editar usuário")
    @SecurityRequirementsSet(SecurityRequirement(name = "GPET_SESSION"), SecurityRequirement(name = "X-CSRF-Token"))
    @APIResponse(responseCode = "200", description = "Conta atualizada.")
    @APIResponse(responseCode = "404", description = "Conta não encontrada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    @APIResponse(responseCode = "409", description = "Versão desatualizada ou login duplicado.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun editar(@PathParam("id") id: UUID, entrada: EditarUsuarioEntrada) = gestao.editar(
        id, entrada.nome, entrada.login, entrada.ativo, entrada.versao, atual.usuario.id
    ).dto()

    @DELETE
    @Path("{id}")
    @Operation(summary = "Desativar usuário", description = "Desativa a conta e revoga suas sessões; preserva o histórico.")
    @SecurityRequirementsSet(SecurityRequirement(name = "GPET_SESSION"), SecurityRequirement(name = "X-CSRF-Token"))
    @APIResponse(responseCode = "200", description = "Conta desativada.")
    @APIResponse(responseCode = "404", description = "Conta não encontrada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    @APIResponse(responseCode = "409", description = "Versão desatualizada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun desativar(
        @PathParam("id") id: UUID,
        @QueryParam("versao") @Parameter(required = true, description = "Versão esperada para concorrência otimista.", schema = Schema(type = SchemaType.INTEGER, minimum = "0")) versao: Long
    ): UsuarioDto = gestao.desativar(id, versao, atual.usuario.id).dto()

    @PUT
    @Path("{id}/senha")
    @Operation(summary = "Redefinir senha", description = "Define senha temporária, exige troca e revoga as sessões da conta.")
    @SecurityRequirementsSet(SecurityRequirement(name = "GPET_SESSION"), SecurityRequirement(name = "X-CSRF-Token"))
    @APIResponse(responseCode = "200", description = "Senha temporária redefinida.")
    @APIResponse(responseCode = "404", description = "Conta não encontrada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    @APIResponse(responseCode = "409", description = "Versão desatualizada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun redefinir(@PathParam("id") id: UUID, entrada: RedefinirSenhaEntrada) =
        gestao.redefinirSenha(id, entrada.senhaTemporaria, entrada.versao, atual.usuario.id).dto()
}
