package br.ufpr.gpet.identidade.presentation

import br.ufpr.gpet.identidade.application.GestaoIdentidade
import br.ufpr.gpet.identidade.domain.RepositorioIdentidade
import br.ufpr.gpet.shared.domain.*
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import java.util.UUID

@Path("/api/v1/admin/usuarios")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
class UsuariosResource(
    private val repositorio: RepositorioIdentidade,
    private val gestao: GestaoIdentidade,
    private val atual: IdentidadeAtual
) {
    @GET
    fun listar(
        @QueryParam("pagina") @DefaultValue("0") pagina: Int,
        @QueryParam("tamanho") @DefaultValue("20") tamanho: Int
    ): Pagina<UsuarioDto> {
        val resultado = repositorio.usuarios(Paginacao(pagina, tamanho))
        return Pagina(resultado.itens.map { it.dto() }, resultado.total, pagina, tamanho)
    }

    @GET
    @Path("{id}")
    fun detalhe(@PathParam("id") id: UUID) = (repositorio.usuario(id) ?: ausente()).dto()

    @POST
    fun criar(entrada: NovoUsuarioEntrada) =
        gestao.criar(entrada.nome, entrada.login, entrada.senhaTemporaria, atual.usuario.id).dto()

    @PUT
    @Path("{id}")
    fun editar(@PathParam("id") id: UUID, entrada: EditarUsuarioEntrada) = gestao.editar(
        id,
        entrada.nome,
        entrada.login,
        entrada.ativo,
        entrada.versao,
        atual.usuario.id
    ).dto()

    @DELETE
    @Path("{id}")
    fun desativar(@PathParam("id") id: UUID, @QueryParam("versao") versao: Long): UsuarioDto {
        val u = repositorio.usuario(id) ?: ausente()
        return gestao.editar(id, u.nome, u.login, false, versao, atual.usuario.id).dto()
    }

    @PUT
    @Path("{id}/senha")
    fun redefinir(@PathParam("id") id: UUID, entrada: RedefinirSenhaEntrada) =
        gestao.redefinirSenha(id, entrada.senhaTemporaria, entrada.versao, atual.usuario.id).dto()
}
