package br.ufpr.gpet.atividades.presentation

import br.ufpr.gpet.atividades.application.DadosCategoria
import org.eclipse.microprofile.openapi.annotations.media.Schema

@Schema(description = "Dados de criação ou edição de categoria.")
data class CategoriaEntrada(
    @field:Schema(enumeration = ["informativa", "formativa"], required = true) val natureza: String,
    @field:Schema(minLength = 1, maxLength = 200, required = true, example = "Categoria fictícia") val nome: String,
    @field:Schema(minLength = 1, maxLength = 10000, required = true) val descricao: String,
    @field:Schema(description = "Categorias referenciadas são desativadas em vez de removidas.") val ativo: Boolean = true,
    @field:Schema(description = "Versão para concorrência otimista; use 0 na criação.", minimum = "0") val versao: Long = 0,
) {
    fun comando() = DadosCategoria(natureza, nome, descricao, ativo, versao)
}
