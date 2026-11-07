package br.ufpr.gpet.identidade.infrastructure

import br.ufpr.gpet.identidade.application.GestaoIdentidade
import io.quarkus.runtime.Quarkus
import io.quarkus.runtime.QuarkusApplication
import io.quarkus.runtime.annotations.QuarkusMain
import org.flywaydb.core.Flyway
import java.nio.file.Files
import java.nio.file.Path

@QuarkusMain

class Operacao(private val flyway: Flyway, private val gestao: GestaoIdentidade) :
    QuarkusApplication {
    override fun run(vararg args: String): Int {
        when (args.firstOrNull()) {
            "migrate" -> {
                flyway.migrate()
                return 0
            }

            "migrate-bootstrap" -> {
                flyway.migrate()
                bootstrap()
                return 0
            }

            "bootstrap" -> {
                bootstrap()
                return 0
            }

            null -> Quarkus.waitForExit()
            else -> error("Comando desconhecido. Use migrate, migrate-bootstrap ou bootstrap.")
        }
        return 0
    }

    private fun bootstrap() {
        val arquivo = System.getenv("GPET_ADMIN_PASSWORD_FILE")
            ?: error("Defina GPET_ADMIN_PASSWORD_FILE com o caminho do secret.")
        val senha = Files.readString(Path.of(arquivo)).trimEnd('\r', '\n')
        val criado = gestao.bootstrap(senha)
        println(if (criado) "Conta inicial criada; troca de senha obrigatória." else "Bootstrap ignorado: já existem usuários.")
    }
}
