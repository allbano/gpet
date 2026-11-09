package br.ufpr.gpet.atividades.presentation

import br.ufpr.gpet.atividades.application.GestaoAtividades
import br.ufpr.gpet.atividades.domain.*
import br.ufpr.gpet.identidade.application.IdentidadeAtual
import br.ufpr.gpet.shared.domain.*
import br.ufpr.gpet.shared.presentation.ErroHttp
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType
import org.eclipse.microprofile.openapi.annotations.media.Content
import org.eclipse.microprofile.openapi.annotations.media.Schema
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirementsSet
import org.eclipse.microprofile.openapi.annotations.tags.Tag
import java.util.UUID

private const val JSON = "application/json"

fun Categoria.dto() = CategoriaDto(id, natureza, nome, descricao, ativo, versao)
fun Formato.dto() = FormatoDto(id, nome, descricao, ativo, versao)

@Path("/api/v1/admin/categorias")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Catálogos administrativos")
@SecurityRequirement(name = "GPET_SESSION")
@APIResponses(
    APIResponse(responseCode = "400", description = "Filtro, parâmetro ou payload inválido (validacao ou requisicao_invalida).", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))]),
    APIResponse(responseCode = "401", description = "Sessão ausente ou expirada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))]),
    APIResponse(responseCode = "403", description = "CSRF inválido em escritas ou troca de senha obrigatória.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
)
class CategoriasResource(private val gestao: GestaoAtividades, private val atual: IdentidadeAtual) {
    @GET
    @Operation(summary = "Listar categorias")
    @APIResponse(responseCode = "200", description = "Página de categorias administrativas.")
    fun listar(
        @QueryParam("pagina") @DefaultValue("0")
        @Parameter(schema = Schema(type = SchemaType.INTEGER, defaultValue = "0", minimum = "0", maximum = "1000000"), description = "Página entre 0 e 1000000.") pagina: Int,
        @QueryParam("tamanho") @DefaultValue("20")
        @Parameter(schema = Schema(type = SchemaType.INTEGER, defaultValue = "20", minimum = "1", maximum = "100"), description = "Itens por página, entre 1 e 100.") tamanho: Int,
        @QueryParam("natureza") @Parameter(schema = Schema(enumeration = ["informativa", "formativa"])) natureza: String?
    ): Pagina<CategoriaDto> {
        val p = gestao.categorias(Paginacao(pagina, tamanho), natureza)
        return Pagina(p.itens.map { it.dto() }, p.total, pagina, tamanho)
    }

    @GET
    @Path("{id}")
    @Operation(summary = "Detalhar categoria")
    @APIResponse(responseCode = "200", description = "Categoria encontrada.")
    @APIResponse(responseCode = "404", description = "Categoria não encontrada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun detalhe(@PathParam("id") id: UUID) = gestao.categoria(id).dto()

    @POST
    @Operation(summary = "Criar categoria")
    @SecurityRequirementsSet(SecurityRequirement(name = "GPET_SESSION"), SecurityRequirement(name = "X-CSRF-Token"))
    @APIResponse(responseCode = "200", description = "Categoria criada.")
    @APIResponse(responseCode = "409", description = "Nome duplicado ou conflito de persistência.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun criar(entrada: CategoriaEntrada) = gestao.criar(entrada.comando(), atual.usuario.id).dto()

    @PUT
    @Path("{id}")
    @Operation(summary = "Editar categoria")
    @SecurityRequirementsSet(SecurityRequirement(name = "GPET_SESSION"), SecurityRequirement(name = "X-CSRF-Token"))
    @APIResponse(responseCode = "200", description = "Categoria atualizada.")
    @APIResponse(responseCode = "404", description = "Categoria não encontrada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    @APIResponse(responseCode = "409", description = "Versão desatualizada, nome duplicado ou mudança de natureza referenciada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun editar(@PathParam("id") id: UUID, entrada: CategoriaEntrada) = gestao.editar(id, entrada.comando(), atual.usuario.id).dto()

    @DELETE
    @Path("{id}")
    @Operation(summary = "Excluir ou desativar categoria", description = "Remove categorias sem referências; desativa categorias já referenciadas.")
    @SecurityRequirementsSet(SecurityRequirement(name = "GPET_SESSION"), SecurityRequirement(name = "X-CSRF-Token"))
    @APIResponse(responseCode = "204", description = "Categoria excluída ou desativada; sem corpo.")
    @APIResponse(responseCode = "404", description = "Categoria não encontrada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    @APIResponse(responseCode = "409", description = "Versão desatualizada ou referência inválida.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun excluir(
        @PathParam("id") id: UUID,
        @QueryParam("versao") @Parameter(required = true, description = "Versão para concorrência otimista.", schema = Schema(type = SchemaType.INTEGER, minimum = "0")) versao: Long
    ): Response {
        gestao.excluirCategoria(id, versao, atual.usuario.id)
        return Response.noContent().build()
    }
}

@Path("/api/v1/admin/formatos")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Catálogos administrativos")
@SecurityRequirement(name = "GPET_SESSION")
@APIResponses(
    APIResponse(responseCode = "400", description = "Parâmetro ou payload inválido (validacao ou requisicao_invalida).", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))]),
    APIResponse(responseCode = "401", description = "Sessão ausente ou expirada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))]),
    APIResponse(responseCode = "403", description = "CSRF inválido em escritas ou troca de senha obrigatória.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
)
class FormatosResource(private val gestao: GestaoAtividades, private val atual: IdentidadeAtual) {
    @GET
    @Operation(summary = "Listar formatos")
    @APIResponse(responseCode = "200", description = "Página de formatos administrativos.")
    fun listar(
        @QueryParam("pagina") @DefaultValue("0")
        @Parameter(schema = Schema(type = SchemaType.INTEGER, defaultValue = "0", minimum = "0", maximum = "1000000"), description = "Página entre 0 e 1000000.") pagina: Int,
        @QueryParam("tamanho") @DefaultValue("20")
        @Parameter(schema = Schema(type = SchemaType.INTEGER, defaultValue = "20", minimum = "1", maximum = "100"), description = "Itens por página, entre 1 e 100.") tamanho: Int
    ): Pagina<FormatoDto> {
        val p = gestao.formatos(Paginacao(pagina, tamanho))
        return Pagina(p.itens.map { it.dto() }, p.total, pagina, tamanho)
    }

    @GET
    @Path("{id}")
    @Operation(summary = "Detalhar formato")
    @APIResponse(responseCode = "200", description = "Formato encontrado.")
    @APIResponse(responseCode = "404", description = "Formato não encontrado.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun detalhe(@PathParam("id") id: UUID) = gestao.formato(id).dto()

    @POST
    @Operation(summary = "Criar formato")
    @SecurityRequirementsSet(SecurityRequirement(name = "GPET_SESSION"), SecurityRequirement(name = "X-CSRF-Token"))
    @APIResponse(responseCode = "200", description = "Formato criado.")
    @APIResponse(responseCode = "409", description = "Nome duplicado ou conflito de persistência.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun criar(entrada: FormatoEntrada) = gestao.criar(entrada.comando(), atual.usuario.id).dto()

    @PUT
    @Path("{id}")
    @Operation(summary = "Editar formato")
    @SecurityRequirementsSet(SecurityRequirement(name = "GPET_SESSION"), SecurityRequirement(name = "X-CSRF-Token"))
    @APIResponse(responseCode = "200", description = "Formato atualizado.")
    @APIResponse(responseCode = "404", description = "Formato não encontrado.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    @APIResponse(responseCode = "409", description = "Versão desatualizada ou nome duplicado.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun editar(@PathParam("id") id: UUID, entrada: FormatoEntrada) = gestao.editar(id, entrada.comando(), atual.usuario.id).dto()

    @DELETE
    @Path("{id}")
    @Operation(summary = "Excluir ou desativar formato", description = "Remove formatos sem referências; desativa formatos já referenciados.")
    @SecurityRequirementsSet(SecurityRequirement(name = "GPET_SESSION"), SecurityRequirement(name = "X-CSRF-Token"))
    @APIResponse(responseCode = "204", description = "Formato excluído ou desativado; sem corpo.")
    @APIResponse(responseCode = "404", description = "Formato não encontrado.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    @APIResponse(responseCode = "409", description = "Versão desatualizada ou referência inválida.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun excluir(
        @PathParam("id") id: UUID,
        @QueryParam("versao") @Parameter(required = true, description = "Versão para concorrência otimista.", schema = Schema(type = SchemaType.INTEGER, minimum = "0")) versao: Long
    ): Response {
        gestao.excluirFormato(id, versao, atual.usuario.id)
        return Response.noContent().build()
    }
}

@Path("/api/v1/public")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Catálogos públicos")
@APIResponse(responseCode = "400", description = "Filtro ou parâmetro inválido (validacao ou requisicao_invalida).", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
class CatalogosPublicosResource(private val gestao: GestaoAtividades) {
    @GET
    @Path("categorias")
    @Operation(summary = "Listar categorias ativas publicamente")
    @APIResponse(responseCode = "200", description = "Página pública de categorias ativas.")
    fun categorias(
        @QueryParam("pagina") @DefaultValue("0")
        @Parameter(schema = Schema(type = SchemaType.INTEGER, defaultValue = "0", minimum = "0", maximum = "1000000"), description = "Página entre 0 e 1000000.") pagina: Int,
        @QueryParam("tamanho") @DefaultValue("20")
        @Parameter(schema = Schema(type = SchemaType.INTEGER, defaultValue = "20", minimum = "1", maximum = "100"), description = "Itens por página, entre 1 e 100.") tamanho: Int,
        @QueryParam("natureza") @Parameter(schema = Schema(enumeration = ["informativa", "formativa"])) natureza: String?
    ): Pagina<CategoriaPublicaDto> {
        val p = gestao.categorias(Paginacao(pagina, tamanho), natureza, true)
        return Pagina(p.itens.map { CategoriaPublicaDto(it.id, it.natureza, it.nome, it.descricao) }, p.total, pagina, tamanho)
    }

    @GET
    @Path("formatos")
    @Operation(summary = "Listar formatos ativos publicamente")
    @APIResponse(responseCode = "200", description = "Página pública de formatos ativos.")
    fun formatos(
        @QueryParam("pagina") @DefaultValue("0")
        @Parameter(schema = Schema(type = SchemaType.INTEGER, defaultValue = "0", minimum = "0", maximum = "1000000"), description = "Página entre 0 e 1000000.") pagina: Int,
        @QueryParam("tamanho") @DefaultValue("20")
        @Parameter(schema = Schema(type = SchemaType.INTEGER, defaultValue = "20", minimum = "1", maximum = "100"), description = "Itens por página, entre 1 e 100.") tamanho: Int
    ): Pagina<FormatoPublicoDto> {
        val p = gestao.formatos(Paginacao(pagina, tamanho), true)
        return Pagina(p.itens.map { FormatoPublicoDto(it.id, it.nome, it.descricao) }, p.total, pagina, tamanho)
    }
}
