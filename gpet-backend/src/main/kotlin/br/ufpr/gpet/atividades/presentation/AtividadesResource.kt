package br.ufpr.gpet.atividades.presentation

import br.ufpr.gpet.atividades.application.*
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

fun Atividade.dto() = AtividadeDto(
    id, natureza, categoriaId, formatoId, titulo, objetivo, descricao, cargaHoraria,
    periodo.inicio, periodo.fim, publicoAlvo, versao
)

@Path("/api/v1/admin/atividades")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Atividades administrativas")
@SecurityRequirement(name = "GPET_SESSION")
@APIResponses(
    APIResponse(responseCode = "400", description = "Filtro, parâmetro ou payload inválido (validacao ou requisicao_invalida).", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))]),
    APIResponse(responseCode = "401", description = "Sessão ausente ou expirada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))]),
    APIResponse(responseCode = "403", description = "CSRF inválido em escritas ou troca de senha obrigatória em qualquer operação administrativa.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
)
class AtividadesResource(private val gestao: GestaoAtividades, private val atual: IdentidadeAtual) {
    @GET
    @Operation(summary = "Listar atividades", description = "Lista administrativa paginada com filtros combinados.")
    @APIResponse(responseCode = "200", description = "Página de atividades administrativas.")
    fun listar(
        @QueryParam("pagina") @DefaultValue("0")
        @Parameter(description = "Página entre 0 e 1000000.", schema = Schema(type = SchemaType.INTEGER, defaultValue = "0", minimum = "0", maximum = "1000000")) pagina: Int,
        @QueryParam("tamanho") @DefaultValue("20")
        @Parameter(description = "Itens por página, entre 1 e 100.", schema = Schema(type = SchemaType.INTEGER, defaultValue = "20", minimum = "1", maximum = "100")) tamanho: Int,
        @QueryParam("natureza") @Parameter(description = "Filtra por natureza.", schema = Schema(enumeration = ["informativa", "formativa"])) natureza: String?,
        @QueryParam("categoriaId") @Parameter(description = "UUID da categoria.", schema = Schema(format = "uuid")) categoriaId: UUID?,
        @QueryParam("formatoId") @Parameter(description = "UUID do formato.", schema = Schema(format = "uuid")) formatoId: UUID?,
        @QueryParam("titulo") @Parameter(description = "Trecho do título, sem diferenciar maiúsculas. Valores não brancos têm no máximo 300 caracteres antes do trim.", schema = Schema(maxLength = 300)) titulo: String?
    ): Pagina<AtividadeDto> {
        val p = gestao.atividades(Paginacao(pagina, tamanho), FiltroAtividade(natureza, categoriaId, formatoId, titulo))
        return Pagina(p.itens.map { it.dto() }, p.total, pagina, tamanho)
    }

    @GET
    @Path("{id}")
    @Operation(summary = "Detalhar atividade")
    @APIResponse(responseCode = "200", description = "Atividade encontrada.")
    @APIResponse(responseCode = "404", description = "Atividade não encontrada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun detalhe(@PathParam("id") @Parameter(schema = Schema(format = "uuid"), required = true) id: UUID) = gestao.atividade(id).dto()

    @POST
    @Operation(summary = "Criar atividade", description = "Gera o identificador na aplicação e valida os catálogos ativos.")
    @SecurityRequirementsSet(SecurityRequirement(name = "GPET_SESSION"), SecurityRequirement(name = "X-CSRF-Token"))
    @APIResponse(responseCode = "200", description = "Atividade criada.")
    @APIResponse(responseCode = "404", description = "Categoria ou formato não encontrado.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    @APIResponse(responseCode = "409", description = "Associação inválida ou conflito de persistência.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun criar(entrada: AtividadeEntrada) = gestao.criar(entrada.comando(), atual.usuario.id).dto()

    @PUT
    @Path("{id}")
    @Operation(summary = "Editar atividade", description = "Valida o payload antes de carregar a versão persistida, preservando a precedência dos erros.")
    @SecurityRequirementsSet(SecurityRequirement(name = "GPET_SESSION"), SecurityRequirement(name = "X-CSRF-Token"))
    @APIResponse(responseCode = "200", description = "Atividade atualizada.")
    @APIResponse(responseCode = "404", description = "Atividade, categoria ou formato não encontrado.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    @APIResponse(responseCode = "409", description = "Versão desatualizada ou associação inválida.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun editar(@PathParam("id") id: UUID, entrada: AtividadeEntrada) = gestao.editar(id, entrada.comando(), atual.usuario.id).dto()

    @DELETE
    @Path("{id}")
    @Operation(summary = "Excluir atividade", description = "Exige a versão atual para concorrência otimista.")
    @SecurityRequirementsSet(SecurityRequirement(name = "GPET_SESSION"), SecurityRequirement(name = "X-CSRF-Token"))
    @APIResponse(responseCode = "204", description = "Atividade excluída; sem corpo.")
    @APIResponse(responseCode = "404", description = "Atividade não encontrada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    @APIResponse(responseCode = "409", description = "Versão desatualizada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun excluir(
        @PathParam("id") id: UUID,
        @QueryParam("versao") @Parameter(required = true, description = "Versão esperada para concorrência otimista.", schema = Schema(type = SchemaType.INTEGER, minimum = "0")) versao: Long
    ): Response {
        gestao.excluirAtividade(id, versao, atual.usuario.id)
        return Response.noContent().build()
    }
}

@Path("/api/v1/public/atividades")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Atividades públicas")
@APIResponse(responseCode = "400", description = "Filtro ou parâmetro inválido (validacao ou requisicao_invalida).", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
class AtividadesPublicasResource(private val gestao: GestaoAtividades) {
    private fun publico(modelo: AtividadePublica): AtividadePublicaDto {
        val a = modelo.atividade
        return AtividadePublicaDto(
            a.id, a.natureza, a.categoriaId, a.formatoId, modelo.categoriaNome, modelo.formatoNome,
            a.titulo, a.objetivo, a.descricao, a.cargaHoraria, a.periodo.inicio, a.periodo.fim, a.publicoAlvo
        )
    }

    @GET
    @Operation(summary = "Listar atividades publicamente", description = "Consulta pública com nomes de categoria e formato, sem autenticação.")
    @APIResponse(responseCode = "200", description = "Página pública de atividades.")
    fun listar(
        @QueryParam("pagina") @DefaultValue("0")
        @Parameter(description = "Página entre 0 e 1000000.", schema = Schema(type = SchemaType.INTEGER, defaultValue = "0", minimum = "0", maximum = "1000000")) pagina: Int,
        @QueryParam("tamanho") @DefaultValue("20")
        @Parameter(description = "Itens por página, entre 1 e 100.", schema = Schema(type = SchemaType.INTEGER, defaultValue = "20", minimum = "1", maximum = "100")) tamanho: Int,
        @QueryParam("natureza") @Parameter(schema = Schema(enumeration = ["informativa", "formativa"])) natureza: String?,
        @QueryParam("categoriaId") @Parameter(schema = Schema(format = "uuid")) categoriaId: UUID?,
        @QueryParam("formatoId") @Parameter(schema = Schema(format = "uuid")) formatoId: UUID?,
        @QueryParam("titulo") @Parameter(description = "Trecho do título; o limite de 300 caracteres é medido antes do trim para valores não brancos.", schema = Schema(maxLength = 300)) titulo: String?
    ): Pagina<AtividadePublicaDto> {
        val p = gestao.atividadesPublicas(Paginacao(pagina, tamanho), FiltroAtividade(natureza, categoriaId, formatoId, titulo))
        return Pagina(p.itens.map(::publico), p.total, pagina, tamanho)
    }

    @GET
    @Path("{id}")
    @Operation(summary = "Detalhar atividade publicamente")
    @APIResponse(responseCode = "200", description = "Atividade pública encontrada.")
    @APIResponse(responseCode = "404", description = "Atividade não encontrada.", content = [Content(mediaType = JSON, schema = Schema(implementation = ErroHttp::class))])
    fun detalhe(@PathParam("id") @Parameter(schema = Schema(format = "uuid"), required = true) id: UUID) =
        publico(gestao.atividadePublica(id))
}
