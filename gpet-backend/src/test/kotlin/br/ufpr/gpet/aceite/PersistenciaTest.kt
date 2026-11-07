package br.ufpr.gpet.aceite

import br.ufpr.gpet.atividades.application.GestaoAtividades
import br.ufpr.gpet.atividades.domain.*
import br.ufpr.gpet.identidade.application.GestaoIdentidade
import br.ufpr.gpet.identidade.domain.RepositorioIdentidade
import br.ufpr.gpet.shared.domain.*
import br.ufpr.gpet.shared.infrastructure.Banco
import io.quarkus.narayana.jta.QuarkusTransaction
import io.quarkus.test.common.QuarkusTestResource
import io.quarkus.test.junit.QuarkusTest
import jakarta.inject.Inject
import org.jooq.exception.DataAccessException
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.time.LocalDate
import java.util.UUID
import java.util.concurrent.Callable
import java.util.concurrent.Executors

@QuarkusTest
@QuarkusTestResource(PostgresRecurso::class, restrictToAnnotatedClass = true)
class PersistenciaTest {
    @Inject lateinit var banco: Banco
    @Inject lateinit var identidade: GestaoIdentidade
    @Inject lateinit var usuarios: RepositorioIdentidade
    @Inject lateinit var gestao: GestaoAtividades
    @Inject lateinit var atividades: RepositorioAtividades
    private val autor = UUID.fromString("30000000-0000-0000-0000-000000000001")

    @Test fun `rollback transacional desfaz gravacao via jooq`() {
        val login = "rollback-" + UUID.randomUUID().toString().take(8)
        assertThrows(IllegalStateException::class.java) {
            QuarkusTransaction.requiringNew().run {
                identidade.criar("Pessoa fictícia",login,"senha ficticia de testes")
                error("falha simulada após gravar")
            }
        }
        assertNull(usuarios.porLogin(login))
    }
    @Test fun `banco rejeita nome duplicado ignorando caixa e espacos externos`() {
        val nome = "Catálogo " + UUID.randomUUID()
        gestao.salvar(Formato(UUID.randomUUID(),nome,"Fictício",true,0),autor,true)
        assertThrows(DataAccessException::class.java) { gestao.salvar(Formato(UUID.randomUUID(),"  ${nome.uppercase()}  ","Fictício",true,0),autor,true) }
        gestao.salvar(Categoria(UUID.randomUUID(),"informativa",nome,"Fictício",true,0),autor,true)
        gestao.salvar(Categoria(UUID.randomUUID(),"formativa",nome,"Fictício",true,0),autor,true)
        assertThrows(DataAccessException::class.java) { gestao.salvar(Categoria(UUID.randomUUID(),"formativa",nome.uppercase(),"Fictício",true,0),autor,true) }
    }
    @Test fun `constraints postgres protegem periodo natureza e campo especifico`() {
        val categoria = UUID.fromString("20000000-0000-0000-0000-000000000003")
        val formato = UUID.fromString("10000000-0000-0000-0000-000000000001")
        fun inserir(natureza: String, descricao: String?, inicio: String, fim: String) {
            banco.sql.execute("insert into atividades(id,natureza,categoria_id,formato_id,titulo,descricao,carga_horaria,inicio,fim,publico_alvo,criado_por,atualizado_por) values (?,?,?,?,?,?,?,cast(? as date),cast(? as date),?,?,?)",UUID.randomUUID(),natureza,categoria,formato,"Fictícia",descricao,"texto livre",inicio,fim,"Docentes",autor,autor)
        }
        assertThrows(DataAccessException::class.java) { inserir("formativa",null,"2026-11-01","2026-11-02") }
        assertThrows(DataAccessException::class.java) { inserir("formativa","Teste","2026-11-02","2026-11-01") }
        assertThrows(DataAccessException::class.java) { inserir("informativa","Teste","2026-11-01","2026-11-02") }
    }
    @Test fun `categoria referenciada preserva natureza e banco recusa nova associacao desativada`() {
        val c = gestao.salvar(Categoria(UUID.randomUUID(),"formativa","Categoria ${UUID.randomUUID()}","Fictícia",true,0),autor,true)
        val f = gestao.salvar(Formato(UUID.randomUUID(),"Formato ${UUID.randomUUID()}","Fictício",true,0),autor,true)
        val a = gestao.salvar(Atividade(UUID.randomUUID(),"formativa",c.id,f.id,"Fictícia",null,"Formação","Carga textual",Periodo(LocalDate.parse("2026-11-01"),LocalDate.parse("2026-11-02")),"Docentes",0),autor,true)
        assertThrows(Falha::class.java) { gestao.salvar(c.copy(natureza = "informativa"),autor,false) }
        gestao.excluirCategoria(c.id,c.versao,autor)
        assertFalse(atividades.categoria(c.id)!!.ativo)
        assertNotNull(atividades.atividade(a.id))
        assertThrows(DataAccessException::class.java) {
            // Pular aplicação não permite burlar a regra de catálogo no PostgreSQL.
            QuarkusTransaction.requiringNew().run { atividades.salvar(a.copy(id = UUID.randomUUID()),autor,true) }
        }
    }
    @Test fun `edicoes concorrentes permitem apenas uma gravacao por versao`() {
        val c = UUID.fromString("20000000-0000-0000-0000-000000000003")
        val f = UUID.fromString("10000000-0000-0000-0000-000000000001")
        val original = gestao.salvar(Atividade(UUID.randomUUID(),"formativa",c,f,"Fictícia",null,"Formação","Carga textual",Periodo(LocalDate.parse("2026-11-01"),LocalDate.parse("2026-11-02")),"Docentes",0),autor,true)
        Executors.newFixedThreadPool(2).use { pool ->
            val resultados = pool.invokeAll((1..2).map { numero -> Callable {
                try { gestao.salvar(original.copy(titulo = "Edição $numero"),autor,false); 200 } catch(falha: Falha) { falha.status }
            } }).map { it.get() }
            assertEquals(listOf(200,409),resultados.sorted())
        }
    }
}
