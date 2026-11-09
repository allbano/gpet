package br.ufpr.gpet.identidade.application

import br.ufpr.gpet.shared.domain.LimiteLoginExcedido
import jakarta.enterprise.context.ApplicationScoped
import java.time.Clock
import java.time.Instant
import java.util.Locale

@ApplicationScoped
class LimiteLogin(private val relogio: Clock) {
    private data class Tentativas(var quantidade: Int, val inicio: Instant)

    private val tentativas = mutableMapOf<String, Tentativas>()

    @Synchronized
    fun sucesso(login: String) {
        tentativas.remove(login.trim().lowercase(Locale.ROOT).take(100))
    }

    @Synchronized
    fun verificar(login: String) {
        val agora = relogio.instant()
        tentativas.entries.removeIf { it.value.inicio.plusSeconds(900) <= agora }
        // Limite global também impede contornar o controle com logins aleatórios e crescimento ilimitado.
        val global = tentativas.getOrPut("*") { Tentativas(0, agora) }
        if (global.quantidade >= 300) throw LimiteLoginExcedido()
        global.quantidade++
        val chave = login.trim().lowercase(Locale.ROOT).take(100)
        val atual = tentativas.getOrPut(chave) { Tentativas(0, agora) }
        if (atual.quantidade >= 5) throw LimiteLoginExcedido()
        atual.quantidade++
    }
}
