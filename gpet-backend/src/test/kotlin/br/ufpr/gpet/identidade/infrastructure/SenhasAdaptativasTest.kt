package br.ufpr.gpet.identidade.infrastructure

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class SenhasAdaptativasTest {
    @Test fun `salt aleatorio diferencia hashes e verifica somente senha correta`() {
        val senhas = SenhasAdaptativas()
        val senha = "credencial ficticia de testes"
        val primeiro = senhas.hash(senha); val segundo = senhas.hash(senha)
        assertNotEquals(primeiro,segundo)
        assertFalse(primeiro.contains(senha))
        assertTrue(senhas.confere(senha,primeiro)); assertTrue(senhas.confere(senha,segundo))
        assertFalse(senhas.confere("senha errada ficticia",primeiro))
        assertFalse(senhas.confere(senha,"hash malformado"))
        assertFalse(senhas.confere("a".repeat(1025),primeiro))
    }
}
