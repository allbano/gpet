package br.ufpr.gpet.atividades.domain

import br.ufpr.gpet.shared.domain.*
import java.time.LocalDate

data class Periodo(val inicio: LocalDate, val fim: LocalDate) {
    init {
        exigir(!fim.isBefore(inicio), "O fim deve ser igual ou posterior ao início.")
    }
}
