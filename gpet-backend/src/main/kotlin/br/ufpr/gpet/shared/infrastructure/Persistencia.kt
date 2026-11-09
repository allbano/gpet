package br.ufpr.gpet.shared.infrastructure

import br.ufpr.gpet.shared.domain.*
import org.jooq.exception.DataAccessException

inline fun <T> persistencia(operacao: () -> T): T {
    try {
        return operacao()
    } catch (exception: DataAccessException) {
        throw when (exception.sqlState()) {
            "23505" -> Duplicado("Já existe um registro com esse nome ou login.")
            "23503" -> Referenciado()
            "23514", "22001" -> Validacao("Os dados violam uma regra de cadastro.")
            else -> ErroInterno(exception)
        }
    }
}
