package br.ufpr.gpet.identidade.application

import br.ufpr.gpet.identidade.domain.*
import br.ufpr.gpet.shared.domain.*
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import java.util.UUID

/** Fake de porta: o domínio e os casos de uso rodam sem Quarkus, Docker ou PostgreSQL. */
class IdentidadeMock : RepositorioIdentidade {
    val contas = mutableMapOf<UUID, Usuario>()
    val sessoes = mutableMapOf<String, Sessao>()
    override fun bloquearAlteracoes() = Unit
    override fun totalUsuarios() = contas.size.toLong()
    override fun usuarios(paginacao: Paginacao) = Pagina(contas.values.toList(),totalUsuarios(),paginacao.pagina,paginacao.tamanho)
    override fun usuario(id: UUID) = contas[id]
    override fun porLogin(login: String) = contas.values.find { it.login == login }
    override fun ativos() = contas.values.count { it.ativo }.toLong()
    override fun salvar(usuario: Usuario, novo: Boolean, autor: UUID?): Usuario {
        val salvo = usuario.copy(versao = if(novo) 0 else usuario.versao + 1)
        contas[salvo.id] = salvo; return salvo
    }
    override fun salvar(sessao: Sessao) { sessoes[sessao.tokenHash] = sessao }
    override fun sessao(hash: String) = sessoes[hash]
    override fun revogar(hash: String) { sessoes.remove(hash) }
    override fun revogarUsuario(id: UUID) { sessoes.entries.removeIf { it.value.usuarioId == id } }
}
class SenhasMock : Senhas {
    override fun hash(senha: String) = "mock:$senha"
    override fun confere(senha: String, hash: String) = hash == hash(senha)
}
class TokensMock : Tokens {
    private var sequencia = 0
    override fun aleatorio() = "token-ficticio-${++sequencia}"
    override fun hash(token: String) = "hash:$token"
}
class GestaoIdentidadeTest {
    private val repo = IdentidadeMock()
    private val agora = Instant.parse("2026-11-06T12:00:00Z")
    private val tokens = TokensMock()
    private val gestao = GestaoIdentidade(repo,SenhasMock(),Clock.fixed(agora,ZoneOffset.UTC),tokens)
    private val senha = "senha ficticia de testes"
    @Test fun `bootstrap repetido preserva credencial existente`() {
        assertTrue(gestao.bootstrap(senha))
        assertFalse(gestao.bootstrap("outra senha ficticia"))
        assertEquals(1,repo.contas.size)
        assertTrue(repo.porLogin("admin")!!.trocarSenha)
        assertNotNull(gestao.login("ADMIN",senha))
    }
    @Test fun `rejeita login duplicado apos normalizacao`() {
        gestao.criar("Pessoa fictícia"," Pessoa ",senha)
        assertThrows(LoginDuplicado::class.java) { gestao.criar("Outra","PESSOA",senha) }
    }
    @Test fun `impede desativar ultimo ativo`() {
        val u = gestao.criar("Pessoa fictícia","pessoa",senha)
        assertThrows(Falha::class.java) { gestao.editar(u.id,u.nome,u.login,false,u.versao) }
        assertTrue(repo.usuario(u.id)!!.ativo)
    }
    @Test fun `desativacao revoga sessoes e impede novo login`() {
        gestao.bootstrap(senha)
        val u = gestao.criar("Pessoa fictícia","pessoa",senha)
        val login = gestao.login(u.login,senha)
        gestao.editar(u.id,u.nome,u.login,false,u.versao)
        assertThrows(Falha::class.java) { gestao.autenticar(login.token) }
        assertThrows(Falha::class.java) { gestao.login(u.login,senha) }
    }
    @Test fun `sessao armazena hash e dura oito horas`() {
        gestao.bootstrap(senha)
        val login = gestao.login("admin",senha)
        assertFalse(repo.sessoes.containsKey(login.token))
        assertTrue(repo.sessoes.containsKey(tokens.hash(login.token)))
        assertEquals(agora.plusSeconds(28800),login.sessao.expiraEm)
        val futuro = GestaoIdentidade(repo,SenhasMock(),Clock.fixed(agora.plusSeconds(28800),ZoneOffset.UTC),tokens)
        assertThrows(Falha::class.java) { futuro.autenticar(login.token) }
    }
    @Test fun `logout revoga apenas sessao atual`() {
        gestao.bootstrap(senha); val a = gestao.login("admin",senha); val b = gestao.login("admin",senha)
        gestao.logout(a.token)
        assertThrows(Falha::class.java) { gestao.autenticar(a.token) }
        assertNotNull(gestao.autenticar(b.token))
    }
    @Test fun `troca obrigatoria termina e revoga todas as sessoes`() {
        gestao.bootstrap(senha); val login = gestao.login("admin",senha)
        gestao.trocarSenha(login.usuario.id,senha,"nova senha ficticia de testes")
        assertFalse(repo.usuario(login.usuario.id)!!.trocarSenha)
        assertThrows(Falha::class.java) { gestao.autenticar(login.token) }
        assertThrows(Falha::class.java) { gestao.login("admin",senha) }
    }
    @Test fun `senha incorreta nao altera credenciais`() {
        gestao.bootstrap(senha); val login = gestao.login("admin",senha)
        assertThrows(Falha::class.java) { gestao.trocarSenha(login.usuario.id,"senha incorreta","nova senha ficticia de testes") }
        assertNotNull(gestao.autenticar(login.token))
    }
    @Test fun `redefinicao exige troca e revoga sessoes`() {
        gestao.bootstrap(senha); val login = gestao.login("admin",senha)
        val u = gestao.redefinirSenha(login.usuario.id,"senha temporaria redefinida",0)
        assertTrue(u.trocarSenha)
        assertThrows(Falha::class.java) { gestao.autenticar(login.token) }
    }
    @Test fun `edicao desatualizada retorna conflito`() {
        gestao.bootstrap(senha); val u = repo.porLogin("admin")!!
        gestao.editar(u.id,"Outro nome",u.login,true,0)
        assertThrows(Conflito::class.java) { gestao.editar(u.id,"Nome antigo",u.login,true,0) }
    }
}
