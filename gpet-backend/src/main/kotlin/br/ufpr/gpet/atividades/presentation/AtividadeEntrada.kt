package br.ufpr.gpet.atividades.presentation

import br.ufpr.gpet.atividades.application.DadosAtividade
import org.eclipse.microprofile.openapi.annotations.media.Schema
import java.time.LocalDate
import java.util.UUID

@Schema(description = "Dados de criação ou edição. Informativa exige objetivo e não aceita descrição; formativa exige descrição e não aceita objetivo.")
data class AtividadeEntrada(
    @field:Schema(enumeration = ["informativa", "formativa"], required = true, example = "formativa")
    val natureza: String,
    @field:Schema(format = "uuid", required = true)
    val categoriaId: UUID,
    @field:Schema(format = "uuid", required = true)
    val formatoId: UUID,
    @field:Schema(minLength = 1, maxLength = 300, required = true, example = "Formação continuada fictícia")
    val titulo: String,
    @field:Schema(description = "Obrigatório somente para natureza informativa; deve ser nulo na formativa.", maxLength = 10000)
    val objetivo: String?,
    @field:Schema(description = "Obrigatória somente para natureza formativa; deve ser nula na informativa.", maxLength = 10000)
    val descricao: String?,
    @field:Schema(minLength = 1, maxLength = 500, required = true, example = "20 horas")
    val cargaHoraria: String,
    @field:Schema(format = "date", required = true, example = "2026-11-01")
    val inicio: LocalDate,
    @field:Schema(format = "date", required = true, example = "2026-11-02")
    val fim: LocalDate,
    @field:Schema(minLength = 1, maxLength = 1000, required = true, example = "Docentes")
    val publicoAlvo: String,
    @field:Schema(description = "Versão para concorrência otimista; use 0 na criação.", minimum = "0", example = "0")
    val versao: Long = 0,
) {
    fun comando() = DadosAtividade(
        natureza, categoriaId, formatoId, titulo, objetivo, descricao, cargaHoraria,
        inicio, fim, publicoAlvo, versao
    )
}
