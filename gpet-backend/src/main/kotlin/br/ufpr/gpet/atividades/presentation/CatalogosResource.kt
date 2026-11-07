package br.ufpr.gpet.atividades.presentation

import br.ufpr.gpet.atividades.application.GestaoAtividades
import br.ufpr.gpet.atividades.domain.*
import br.ufpr.gpet.identidade.presentation.IdentidadeAtual
import br.ufpr.gpet.shared.domain.*
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import java.util.UUID

fun Categoria.dto() = CategoriaDto(id, natureza, nome, descricao, ativo, versao)
fun Formato.dto() = FormatoDto(id, nome, descricao, ativo, versao)

@Path("/api/v1/admin/categorias")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
class CategoriasResource(
    private val repositorio: RepositorioAtividades,
    private val gestao: GestaoAtividades,
    private val atual: IdentidadeAtual
) {
    @GET
    fun listar(
        @QueryParam("pagina") @DefaultValue("0") pagina: Int,
        @QueryParam("tamanho") @DefaultValue("20") tamanho: Int,
        @QueryParam("natureza") natureza: String?
    ): Pagina<CategoriaDto> {
        val p = repositorio.categorias(
            Paginacao(pagina, tamanho),
            natureza
        )
        return Pagina(p.itens.map { it.dto() }, p.total, pagina, tamanho)
    }

    @GET
    @Path("{id}")
    fun detalhe(@PathParam("id") id: UUID) = (repositorio.categoria(id) ?: ausente()).dto()

    @POST
    fun criar(entrada: CategoriaEntrada) =
        gestao.salvar(entrada.dominio(UUID.randomUUID()), atual.usuario.id, true).dto()

    @PUT
    @Path("{id}")
    fun editar(@PathParam("id") id: UUID, entrada: CategoriaEntrada) =
        gestao.salvar(entrada.dominio(id), atual.usuario.id, false).dto()

    @DELETE
    @Path("{id}")
    fun excluir(@PathParam("id") id: UUID, @QueryParam("versao") versao: Long): Response {
        gestao.excluirCategoria(id, versao, atual.usuario.id)
        return Response.noContent().build()
    }
}

@Path("/api/v1/admin/formatos")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
class FormatosResource(
    private val repositorio: RepositorioAtividades,
    private val gestao: GestaoAtividades,
    private val atual: IdentidadeAtual
) {
    @GET
    fun listar(
        @QueryParam("pagina") @DefaultValue("0") pagina: Int,
        @QueryParam("tamanho") @DefaultValue("20") tamanho: Int
    ): Pagina<FormatoDto> {
        val p = repositorio.formatos(
            Paginacao(
                pagina,
                tamanho
            )
        )
        return Pagina(p.itens.map { it.dto() }, p.total, pagina, tamanho)
    }

    @GET
    @Path("{id}")
    fun detalhe(@PathParam("id") id: UUID) = (repositorio.formato(id) ?: ausente()).dto()

    @POST
    fun criar(entrada: FormatoEntrada) =
        gestao.salvar(entrada.dominio(UUID.randomUUID()), atual.usuario.id, true).dto()

    @PUT
    @Path("{id}")
    fun editar(@PathParam("id") id: UUID, entrada: FormatoEntrada) =
        gestao.salvar(entrada.dominio(id), atual.usuario.id, false).dto()

    @DELETE
    @Path("{id}")
    fun excluir(@PathParam("id") id: UUID, @QueryParam("versao") versao: Long): Response {
        gestao.excluirFormato(id, versao, atual.usuario.id)
        return Response.noContent().build()
    }
}

@Path("/api/v1/public")
@Produces(MediaType.APPLICATION_JSON)
class CatalogosPublicosResource(private val repositorio: RepositorioAtividades) {
    @GET
    @Path("categorias")
    fun categorias(
        @QueryParam("pagina") @DefaultValue("0") pagina: Int,
        @QueryParam("tamanho") @DefaultValue("20") tamanho: Int,
        @QueryParam("natureza") natureza: String?
    ): Pagina<CategoriaPublicaDto> {
        val p = repositorio.categorias(
            Paginacao(pagina, tamanho),
            natureza,
            true
        )
        return Pagina(p.itens.map {
            CategoriaPublicaDto(
                it.id,
                it.natureza,
                it.nome,
                it.descricao
            )
        }, p.total, pagina, tamanho)
    }

    @GET
    @Path("formatos")
    fun formatos(
        @QueryParam("pagina") @DefaultValue("0") pagina: Int,
        @QueryParam("tamanho") @DefaultValue("20") tamanho: Int
    ): Pagina<FormatoPublicoDto> {
        val p = repositorio.formatos(
            Paginacao(pagina, tamanho),
            true
        )
        return Pagina(
            p.itens.map { FormatoPublicoDto(it.id, it.nome, it.descricao) },
            p.total,
            pagina,
            tamanho
        )
    }
}
