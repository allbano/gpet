package br.ufpr.gpet.identidade.infrastructure

import br.ufpr.gpet.generated.Tables.SESSOES
import br.ufpr.gpet.generated.Tables.USUARIOS
import br.ufpr.gpet.identidade.domain.*
import br.ufpr.gpet.shared.domain.*
import br.ufpr.gpet.shared.infrastructure.Banco
import jakarta.enterprise.context.ApplicationScoped
import org.jooq.Record
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

@ApplicationScoped

class IdentidadeJooq(private val banco: Banco) : RepositorioIdentidade {
    private fun usuario(r: Record) = Usuario(
        r.get(USUARIOS.ID)!!,
        r.get(USUARIOS.NOME)!!,
        r.get(USUARIOS.LOGIN)!!,
        r.get(USUARIOS.SENHA_HASH)!!,
        r.get(USUARIOS.ATIVO)!!,
        r.get(USUARIOS.TROCAR_SENHA)!!,
        r.get(USUARIOS.VERSAO)!!
    )

    override fun bloquearAlteracoes() {
        banco.sql.fetch("select pg_advisory_xact_lock(741923)")
    }

    override fun totalUsuarios() = banco.sql.fetchCount(USUARIOS).toLong()
    override fun ativos() = banco.sql.fetchCount(USUARIOS, USUARIOS.ATIVO.isTrue).toLong()
    override fun usuarios(paginacao: Paginacao) = Pagina(
        banco.sql.selectFrom(USUARIOS).orderBy(USUARIOS.LOGIN, USUARIOS.ID).limit(paginacao.tamanho)
            .offset(paginacao.offset).fetch().map(::usuario),
        totalUsuarios(),
        paginacao.pagina,
        paginacao.tamanho
    )

    override fun usuario(id: UUID) =
        banco.sql.selectFrom(USUARIOS).where(USUARIOS.ID.eq(id)).fetchOne()?.let(::usuario)

    override fun porLogin(login: String) =
        banco.sql.selectFrom(USUARIOS).where(USUARIOS.LOGIN.eq(login)).fetchOne()?.let(::usuario)

    override fun salvar(usuario: Usuario, novo: Boolean, autor: UUID?): Usuario {
        val u = usuario
        if (novo) banco.sql.insertInto(USUARIOS).set(USUARIOS.ID, u.id)
            .set(USUARIOS.CRIADO_POR, autor ?: u.id).set(USUARIOS.ATUALIZADO_POR, autor ?: u.id)
            .set(USUARIOS.NOME, u.nome).set(USUARIOS.LOGIN, u.login)
            .set(USUARIOS.SENHA_HASH, u.senhaHash).set(USUARIOS.ATIVO, u.ativo)
            .set(USUARIOS.TROCAR_SENHA, u.trocarSenha).execute()
        else if (banco.sql.update(USUARIOS).set(USUARIOS.ATUALIZADO_POR, autor ?: u.id)
                .set(USUARIOS.NOME, u.nome).set(USUARIOS.LOGIN, u.login)
                .set(USUARIOS.SENHA_HASH, u.senhaHash).set(USUARIOS.ATIVO, u.ativo)
                .set(USUARIOS.TROCAR_SENHA, u.trocarSenha)
                .set(USUARIOS.VERSAO, USUARIOS.VERSAO.plus(1))
                .set(USUARIOS.ATUALIZADO_EM, OffsetDateTime.now(ZoneOffset.UTC))
                .where(USUARIOS.ID.eq(u.id).and(USUARIOS.VERSAO.eq(u.versao))).execute() != 1
        ) conflito()
        return usuario(u.id) ?: ausente()
    }

    override fun salvar(sessao: Sessao) {
        banco.sql.deleteFrom(SESSOES)
            .where(SESSOES.EXPIRA_EM.le(OffsetDateTime.now(ZoneOffset.UTC))).execute()
        banco.sql.insertInto(SESSOES).set(SESSOES.TOKEN_HASH, sessao.tokenHash)
            .set(SESSOES.USUARIO_ID, sessao.usuarioId).set(SESSOES.CSRF_TOKEN, sessao.csrfToken)
            .set(SESSOES.EXPIRA_EM, OffsetDateTime.ofInstant(sessao.expiraEm, ZoneOffset.UTC))
            .execute()
    }

    override fun sessao(hash: String) =
        banco.sql.selectFrom(SESSOES).where(SESSOES.TOKEN_HASH.eq(hash)).fetchOne()?.let {
            Sessao(
                it.tokenHash!!,
                it.usuarioId!!,
                it.csrfToken!!,
                it.expiraEm!!.toInstant()
            )
        }

    override fun revogar(hash: String) {
        banco.sql.deleteFrom(SESSOES).where(SESSOES.TOKEN_HASH.eq(hash)).execute()
    }

    override fun revogarUsuario(id: UUID) {
        banco.sql.deleteFrom(SESSOES).where(SESSOES.USUARIO_ID.eq(id)).execute()
    }
}
