package br.ufpr.gpet.aceite

import br.ufpr.gpet.identidade.application.GestaoIdentidade
import br.ufpr.gpet.identidade.domain.RepositorioIdentidade
import br.ufpr.gpet.shared.domain.Falha
import br.ufpr.gpet.shared.infrastructure.Banco
import io.quarkus.test.common.QuarkusTestResource
import io.quarkus.test.junit.QuarkusTest
import jakarta.inject.Inject
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.util.concurrent.Callable
import java.util.concurrent.Executors

@QuarkusTest
@QuarkusTestResource(PostgresRecurso::class, restrictToAnnotatedClass = true)
class IdentidadeConcorrenteTest {
    @Inject lateinit var banco: Banco
    @Inject lateinit var gestao: GestaoIdentidade
    @Inject lateinit var repositorio: RepositorioIdentidade
    @Test fun `novo bootstrap preserva senha alterada e identidade persistida`() {
        banco.sql.execute("truncate table usuarios cascade")
        val inicial = "senha inicial ficticia"
        val definitiva = "Definitiva8"
        assertTrue(gestao.bootstrap(inicial))
        val original = gestao.login("admin", inicial).usuario
        gestao.trocarSenha(original.id, inicial, definitiva)
        val persistido = repositorio.usuario(original.id)!!
        assertFalse(gestao.bootstrap(inicial))
        assertEquals(persistido, repositorio.usuario(original.id))
        assertEquals(original.id, gestao.login("admin", definitiva).usuario.id)
        assertFalse(repositorio.usuario(original.id)!!.trocarSenha)
        assertEquals(401, assertThrows(Falha::class.java) { gestao.login("admin", inicial) }.status)
    }

    @Test fun `bootstrap concorrente e desativacoes preservam exatamente uma conta ativa`() {
        // Somente o banco descartável dedicado a esta classe é reiniciado.
        banco.sql.execute("truncate table usuarios cascade")
        val senha = "senha ficticia concorrente"
        Executors.newFixedThreadPool(2).use { pool ->
            val criados = pool.invokeAll((1..2).map { Callable { gestao.bootstrap(senha) } }).map { it.get() }
            assertEquals(1,criados.count { it }); assertEquals(1L,repositorio.totalUsuarios())
            assertFalse(gestao.bootstrap("outra senha ficticia"))
            val primeiro = gestao.login("admin",senha).usuario
            val segundo = gestao.criar("Segunda conta fictícia","segunda",senha)
            val resultados = pool.invokeAll(listOf(primeiro,segundo).map { usuario -> Callable {
                try { gestao.editar(usuario.id,usuario.nome,usuario.login,false,usuario.versao); 200 } catch(f: Falha) { f.status }
            } }).map { it.get() }
            assertEquals(listOf(200,400),resultados.sorted()); assertEquals(1L,repositorio.ativos())
        }
    }
}
