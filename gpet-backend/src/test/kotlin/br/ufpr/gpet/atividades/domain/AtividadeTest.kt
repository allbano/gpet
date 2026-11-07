package br.ufpr.gpet.atividades.domain

import br.ufpr.gpet.shared.domain.Falha
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.time.LocalDate
import java.util.UUID

class AtividadeTest {
    private val categoria = Categoria(UUID.randomUUID(), "formativa", "Curso", "Cursos de formação", true, 0)
    private val formato = Formato(UUID.randomUUID(), "Presencial", "Na universidade", true, 0)
    private fun atividade(natureza: String = "formativa", objetivo: String? = null, descricao: String? = "Formação docente") =
        Atividade(UUID.randomUUID(), natureza, categoria.id, formato.id, "Curso de educação", objetivo, descricao,
            "20 horas, incluindo estudo autônomo", Periodo(LocalDate.parse("2026-11-01"), LocalDate.parse("2026-11-02")), "Docentes", 0)

    @Test fun `preserva carga horaria textual e aceita categoria compativel`() {
        val item = atividade()
        item.validarCatalogos(categoria, formato)
        assertEquals("20 horas, incluindo estudo autônomo", item.cargaHoraria)
    }
    @Test fun `formativa exige descricao e nao aceita objetivo`() {
        assertThrows(Falha::class.java) { atividade(descricao = " ") }
        assertThrows(Falha::class.java) { atividade(objetivo = "Objetivo") }
    }
    @Test fun `informativa exige objetivo sem descricao`() {
        assertThrows(Falha::class.java) { atividade("informativa", null, null) }
        assertDoesNotThrow { atividade("informativa", "Informar docentes", null) }
    }
    @Test fun `rejeita periodo invertido`() {
        assertThrows(Falha::class.java) { Periodo(LocalDate.parse("2026-11-02"), LocalDate.parse("2026-11-01")) }
    }
    @Test fun `rejeita natureza invalida e titulo vazio`() {
        assertThrows(Falha::class.java) { atividade("outra") }
        assertThrows(Falha::class.java) { atividade().copy(titulo = " ") }
    }
    @Test fun `rejeita categoria de outra natureza`() {
        assertThrows(Falha::class.java) { atividade().validarCatalogos(categoria.copy(natureza = "informativa"), formato) }
    }
    @Test fun `catalogo desativado so pode permanecer em associacao existente`() {
        val item = atividade()
        assertThrows(Falha::class.java) { item.validarCatalogos(categoria.copy(ativo = false), formato) }
        assertDoesNotThrow { item.validarCatalogos(categoria.copy(ativo = false), formato.copy(ativo = false), item) }
    }
}
