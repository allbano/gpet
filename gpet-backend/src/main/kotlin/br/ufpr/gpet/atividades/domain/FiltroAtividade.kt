package br.ufpr.gpet.atividades.domain

import br.ufpr.gpet.shared.domain.*
import java.util.UUID

data class FiltroAtividade(
    val natureza: String? = null,
    val categoriaId: UUID? = null,
    val formatoId: UUID? = null,
    val titulo: String? = null,
) {
    init {
        natureza?.let(::validarNatureza)
        titulo?.takeIf { it.isNotBlank() }?.let {
            exigir(it.length <= 300, "Filtro de título muito longo.")
        }
    }
}
