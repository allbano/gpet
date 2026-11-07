package br.ufpr.gpet.identidade.domain

import br.ufpr.gpet.shared.domain.*
import java.util.Locale
import java.util.UUID

fun normalizarLogin(login: String): String {
    val valor = login.trim().lowercase(Locale.ROOT)
    exigir(
        valor.matches(Regex("[a-z0-9._-]{3,100}")),
        "Login deve ter de 3 a 100 letras, números, pontos, hífens ou sublinhados."
    )
    return valor
}

fun validarSenha(senha: String) =
    exigir(senha.length in 8..64, "Senha deve ter de 8 a 64 caracteres.")

interface Senhas {
    fun hash(senha: String): String
    fun confere(senha: String, hash: String): Boolean
}

interface RepositorioIdentidade {
    fun bloquearAlteracoes()
    fun totalUsuarios(): Long
    fun usuarios(paginacao: Paginacao): Pagina<Usuario>
    fun usuario(id: UUID): Usuario?
    fun porLogin(login: String): Usuario?
    fun ativos(): Long
    fun salvar(usuario: Usuario, novo: Boolean, autor: UUID? = null): Usuario
    fun salvar(sessao: Sessao)
    fun sessao(hash: String): Sessao?
    fun revogar(hash: String)
    fun revogarUsuario(id: UUID)
}
