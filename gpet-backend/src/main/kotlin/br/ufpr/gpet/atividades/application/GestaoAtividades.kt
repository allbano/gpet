package br.ufpr.gpet.atividades.application

import br.ufpr.gpet.atividades.domain.*
import br.ufpr.gpet.shared.domain.*
import jakarta.enterprise.context.ApplicationScoped
import jakarta.transaction.Transactional
import java.util.UUID

@ApplicationScoped

@Transactional

class GestaoAtividades(private val repositorio: RepositorioAtividades) {
    fun salvar(item: Atividade, autor: UUID, nova: Boolean): Atividade {
        val anterior = if (nova) null else repositorio.atividade(item.id) ?: ausente()
        if (anterior != null && anterior.versao != item.versao) conflito()
        item.validarCatalogos(
            repositorio.categoria(item.categoriaId) ?: ausente(),
            repositorio.formato(item.formatoId) ?: ausente(),
            anterior
        )
        return repositorio.salvar(item, autor, nova)
    }

    fun salvar(item: Categoria, autor: UUID, nova: Boolean) = repositorio.salvar(item, autor, nova)
    fun salvar(item: Formato, autor: UUID, novo: Boolean) = repositorio.salvar(item, autor, novo)
    fun excluirAtividade(id: UUID, versao: Long, autor: UUID) =
        repositorio.excluirAtividade(id, versao, autor)

    fun excluirCategoria(id: UUID, versao: Long, autor: UUID) =
        repositorio.excluirCategoria(id, versao, autor)

    fun excluirFormato(id: UUID, versao: Long, autor: UUID) =
        repositorio.excluirFormato(id, versao, autor)
}
