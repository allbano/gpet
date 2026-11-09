package br.ufpr.gpet.identidade.application

import br.ufpr.gpet.identidade.domain.*
import br.ufpr.gpet.shared.domain.*
import jakarta.enterprise.context.ApplicationScoped
import jakarta.transaction.Transactional
import java.time.Clock
import java.time.Duration
import java.util.UUID

@ApplicationScoped

@Transactional

class GestaoIdentidade(
    private val repositorio: RepositorioIdentidade,
    private val senhas: Senhas,
    private val relogio: Clock,
    private val tokens: Tokens,
) {
    private val hashFicticio = senhas.hash("credencial ficticia indisponivel")

    fun usuarios(paginacao: Paginacao) = repositorio.usuarios(paginacao)

    fun usuario(id: UUID) = repositorio.usuario(id) ?: ausente()

    fun desativar(id: UUID, versao: Long, autor: UUID? = null): Usuario {
        val atual = usuario(id)
        return editar(id, atual.nome, atual.login, false, versao, autor)
    }

    fun bootstrap(senha: String): Boolean {
        repositorio.bloquearAlteracoes()
        if (repositorio.totalUsuarios() != 0L) return false
        criar("admin", "admin", senha)
        return true
    }

    fun criar(nome: String, login: String, senha: String, autor: UUID? = null): Usuario {
        repositorio.bloquearAlteracoes()
        validarSenha(senha)
        val normalizado = normalizarLogin(login)
        if (repositorio.porLogin(normalizado) != null) throw LoginDuplicado()
        return repositorio.salvar(
            Usuario(
                UUID.randomUUID(),
                nome.trim(),
                normalizado,
                senhas.hash(senha),
                true,
                true,
                0
            ), true, autor
        )
    }

    fun editar(
        id: UUID,
        nome: String,
        login: String,
        ativo: Boolean,
        versao: Long,
        autor: UUID? = null
    ): Usuario {
        repositorio.bloquearAlteracoes()
        val atual = repositorio.usuario(id) ?: ausente()
        if (atual.versao != versao) conflito()
        val normalizado = normalizarLogin(login)
        val outro = repositorio.porLogin(normalizado)
        if (outro != null && outro.id != id) throw LoginDuplicado()
        if (!ativo && atual.ativo) exigir(
            repositorio.ativos() > 1,
            "Não é possível desativar o último usuário ativo."
        )
        val salvo = repositorio.salvar(
            atual.copy(nome = nome.trim(), login = normalizado, ativo = ativo),
            false,
            autor
        )
        if (!ativo) repositorio.revogarUsuario(id)
        return salvo
    }

    fun redefinirSenha(id: UUID, senha: String, versao: Long, autor: UUID? = null): Usuario {
        repositorio.bloquearAlteracoes()
        validarSenha(senha)
        val atual = repositorio.usuario(id) ?: ausente()
        if (atual.versao != versao) conflito()
        val salvo = repositorio.salvar(
            atual.copy(senhaHash = senhas.hash(senha), trocarSenha = true),
            false,
            autor
        )
        repositorio.revogarUsuario(id)
        return salvo
    }

    fun trocarSenha(id: UUID, senhaAtual: String, novaSenha: String) {
        repositorio.bloquearAlteracoes()
        validarSenha(novaSenha)
        val atual = repositorio.usuario(id) ?: ausente()
        if (!atual.ativo || !senhas.confere(senhaAtual, atual.senhaHash)) throw CredenciaisInvalidas()
        exigir(senhaAtual != novaSenha, "A nova senha deve ser diferente da senha atual.")
        repositorio.salvar(
            atual.copy(senhaHash = senhas.hash(novaSenha), trocarSenha = false),
            false
        )
        repositorio.revogarUsuario(id)
    }

    fun login(login: String, senha: String): LoginCriado {
        repositorio.bloquearAlteracoes()
        val normalizado = login.trim().lowercase(java.util.Locale.ROOT)
        val usuario = repositorio.porLogin(normalizado)
        // Verificação fictícia de mesmo custo evita distinguir usuário inexistente pelo tempo do hash.
        val hash = usuario?.senhaHash ?: hashFicticio
        if (!senhas.confere(senha, hash) || usuario == null || !usuario.ativo) throw CredenciaisInvalidas()
        val token = tokens.aleatorio()
        val sessao = Sessao(
            tokens.hash(token),
            usuario.id,
            tokens.aleatorio(),
            relogio.instant().plus(Duration.ofHours(8))
        )
        repositorio.salvar(sessao)
        return LoginCriado(token, sessao, usuario)
    }

    fun autenticar(token: String?): Pair<Usuario, Sessao> {
        if (token == null || token.length > 128) throw NaoAutenticado("Entre para continuar.")
        val sessao = repositorio.sessao(tokens.hash(token))
        val usuario = sessao?.let { repositorio.usuario(it.usuarioId) }
        if (sessao == null || !sessao.validaEm(relogio.instant()) || usuario == null || !usuario.ativo) {
            throw NaoAutenticado("Sessão expirada. Entre novamente.")
        }
        return usuario to sessao
    }

    fun logout(token: String) = repositorio.revogar(tokens.hash(token))
}
