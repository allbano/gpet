package br.ufpr.gpet.shared.infrastructure

import io.agroal.api.AgroalDataSource
import jakarta.enterprise.context.ApplicationScoped
import jakarta.enterprise.inject.Produces
import org.jooq.SQLDialect
import org.jooq.impl.DSL
import java.time.Clock

@ApplicationScoped

class Banco(private val dataSource: AgroalDataSource) {
    val sql get() = DSL.using(dataSource, SQLDialect.POSTGRES)

    @Produces
    fun relogio(): Clock = Clock.systemUTC()
}
