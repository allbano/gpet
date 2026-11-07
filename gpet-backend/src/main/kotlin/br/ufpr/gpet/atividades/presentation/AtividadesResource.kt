package br.ufpr.gpet.atividades.presentation

import br.ufpr.gpet.atividades.application.GestaoAtividades
import br.ufpr.gpet.atividades.domain.*
import br.ufpr.gpet.identidade.presentation.IdentidadeAtual
import br.ufpr.gpet.shared.domain.*
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import java.util.UUID

fun Atividade.dto() = AtividadeDto(
    id,
    natureza,
    categoriaId,
    formatoId,
    titulo,
    objetivo,
    descricao,
    cargaHoraria,
    periodo.inicio,
    periodo.fim,
    publicoAlvo,
    versao
)

@Path("/api/v1/admin/atividades")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
class AtividadesResource(
    private val repositorio: RepositorioAtividades,
    private val gestao: GestaoAtividades,
    private val atual: IdentidadeAtual
) {
    @GET
    fun listar(
        @QueryParam("pagina") @DefaultValue("0") pagina: Int,
        @QueryParam("tamanho") @DefaultValue("20") tamanho: Int,
        @QueryParam("natureza") natureza: String?,
        @QueryParam("categoriaId") categoriaId: UUID?,
        @QueryParam("formatoId") formatoId: UUID?,
        @QueryParam("titulo") titulo: String?
    ): Pagina<AtividadeDto> {
        val p = repositorio.atividades(
            Paginacao(pagina, tamanho),
            FiltroAtividade(natureza, categoriaId, formatoId, titulo)
        )
        return Pagina(p.itens.map { it.dto() }, p.total, pagina, tamanho)
    }

    @GET
    @Path("{id}")
    fun detalhe(@PathParam("id") id: UUID) = (repositorio.atividade(id) ?: ausente()).dto()

    @POST
    fun criar(entrada: AtividadeEntrada) =
        gestao.salvar(entrada.dominio(UUID.randomUUID()), atual.usuario.id, true).dto()

    @PUT
    @Path("{id}")
    fun editar(@PathParam("id") id: UUID, entrada: AtividadeEntrada) =
        gestao.salvar(entrada.dominio(id), atual.usuario.id, false).dto()

    @DELETE
    @Path("{id}")
    fun excluir(@PathParam("id") id: UUID, @QueryParam("versao") versao: Long): Response {
        gestao.excluirAtividade(id, versao, atual.usuario.id)
        return Response.noContent().build()
    }
}

@Path("/api/v1/public/atividades")
@Produces(MediaType.APPLICATION_JSON)
class AtividadesPublicasResource(private val repositorio: RepositorioAtividades) {
    private fun publico(a: Atividade): AtividadePublicaDto {
        return AtividadePublicaDto(
            a.id,
            a.natureza,
            a.categoriaId,
            a.formatoId,
            repositorio.categoria(a.categoriaId)?.nome ?: "",
            repositorio.formato(a.formatoId)?.nome ?: "",
            a.titulo,
            a.objetivo,
            a.descricao,
            a.cargaHoraria,
            a.periodo.inicio,
            a.periodo.fim,
            a.publicoAlvo
        )
    }

    @GET
    fun listar(
        @QueryParam("pagina") @DefaultValue("0") pagina: Int,
        @QueryParam("tamanho") @DefaultValue("20") tamanho: Int,
        @QueryParam("natureza") natureza: String?,
        @QueryParam("categoriaId") categoriaId: UUID?,
        @QueryParam("formatoId") formatoId: UUID?,
        @QueryParam("titulo") titulo: String?
    ): Pagina<AtividadePublicaDto> {
        val p = repositorio.atividades(
            Paginacao(pagina, tamanho),
            FiltroAtividade(natureza, categoriaId, formatoId, titulo)
        )
        return Pagina(p.itens.map(::publico), p.total, pagina, tamanho)
    }

    @GET
    @Path("{id}")
    fun detalhe(@PathParam("id") id: UUID) = publico(repositorio.atividade(id) ?: ausente())
}
