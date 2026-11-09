package br.ufpr.gpet.atividades.presentation

import br.ufpr.gpet.atividades.application.DadosFormato
import org.eclipse.microprofile.openapi.annotations.media.Schema

@Schema(description = "Dados de criação ou edição de formato.")
data class FormatoEntrada(
    @field:Schema(minLength = 1, maxLength = 200, required = true, example = "Formato fictício") val nome: String,
    @field:Schema(minLength = 1, maxLength = 10000, required = true) val descricao: String,
    @field:Schema(description = "Formatos referenciados são desativados em vez de removidos.") val ativo: Boolean = true,
    @field:Schema(description = "Versão para concorrência otimista; use 0 na criação.", minimum = "0") val versao: Long = 0,
) {
    fun comando() = DadosFormato(nome, descricao, ativo, versao)
}
