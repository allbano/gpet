package br.ufpr.gpet.aceite

import br.ufpr.gpet.identidade.infrastructure.SenhasAdaptativas
import io.quarkus.test.common.QuarkusTestResourceLifecycleManager
import org.flywaydb.core.Flyway
import org.testcontainers.postgresql.PostgreSQLContainer
import java.sql.DriverManager

/** Banco descartável com conta estritamente fictícia; mesmo contrato para JVM e nativo. */
class PostgresRecurso : QuarkusTestResourceLifecycleManager {
    private val postgres = PostgreSQLContainer("postgres:18.6-alpine")
    override fun start(): Map<String,String> {
        postgres.start()
        Flyway.configure().dataSource(postgres.jdbcUrl,postgres.username,postgres.password).locations("classpath:db/migration").load().migrate()
        DriverManager.getConnection(postgres.jdbcUrl,postgres.username,postgres.password).use { c ->
            c.prepareStatement("insert into usuarios(id,nome,login,senha_hash,trocar_senha) values ('30000000-0000-0000-0000-000000000001','Pessoa de teste','aceite',?,false)").use { ps ->
                ps.setString(1,SenhasAdaptativas().hash("senha ficticia de aceite")); ps.executeUpdate()
            }
        }
        return mapOf("quarkus.datasource.jdbc.url" to postgres.jdbcUrl,"quarkus.datasource.username" to postgres.username,"quarkus.datasource.password" to postgres.password,"gpet.cookie-secure" to "false")
    }
    override fun stop() { postgres.stop() }
}
