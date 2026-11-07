package br.ufpr.gpet.identidade.domain

import br.ufpr.gpet.shared.domain.Falha
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID

class UsuarioTest {
    @Test fun `login ignora caixa e espacos externos`() { assertEquals("admin", normalizarLogin(" Admin ")) }
    @Test fun `nao aceita login com espacos internos`() { assertThrows(Falha::class.java) { normalizarLogin("dois usuarios") } }
    @Test fun `senha nova aceita de oito a sessenta e quatro caracteres inclusive`() {
        for (tamanho in listOf(0, 7, 65, 1024)) {
            assertThrows(Falha::class.java) { validarSenha("a".repeat(tamanho)) }
        }
        for (tamanho in listOf(8, 64)) {
            assertDoesNotThrow { validarSenha("a".repeat(tamanho)) }
        }
    }
    @Test fun `sessao expira exatamente no limite de oito horas`() {
        val agora = Instant.parse("2026-11-06T12:00:00Z")
        val sessao = Sessao("hash", UUID.randomUUID(), "csrf", agora.plusSeconds(28800))
        assertTrue(sessao.validaEm(agora))
        assertFalse(sessao.validaEm(agora.plusSeconds(28800)))
    }
}
