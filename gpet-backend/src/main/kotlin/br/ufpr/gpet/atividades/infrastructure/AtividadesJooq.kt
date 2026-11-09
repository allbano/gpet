package br.ufpr.gpet.atividades.infrastructure

import br.ufpr.gpet.generated.Tables.ATIVIDADES
import br.ufpr.gpet.generated.Tables.CATEGORIAS_ATIVIDADE
import br.ufpr.gpet.generated.Tables.FORMATOS_ATIVIDADE
import br.ufpr.gpet.atividades.domain.*
import br.ufpr.gpet.shared.domain.*
import br.ufpr.gpet.shared.infrastructure.*
import jakarta.enterprise.context.ApplicationScoped
import org.jooq.Condition
import org.jooq.Record
import org.jooq.SortField
import org.jooq.Table
import org.jooq.impl.DSL
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

@ApplicationScoped

class AtividadesJooq(private val banco: Banco) : RepositorioAtividades, RepositorioCategorias, RepositorioFormatos {
    private val c = CATEGORIAS_ATIVIDADE
    private val f = FORMATOS_ATIVIDADE
    private val a = ATIVIDADES
    private fun categoria(r: Record) = Categoria(
        r.get(c.ID)!!,
        r.get(c.NATUREZA)!!,
        r.get(c.NOME)!!,
        r.get(c.DESCRICAO)!!,
        r.get(c.ATIVO)!!,
        r.get(c.VERSAO)!!
    )

    private fun formato(r: Record) = Formato(
        r.get(f.ID)!!,
        r.get(f.NOME)!!,
        r.get(f.DESCRICAO)!!,
        r.get(f.ATIVO)!!,
        r.get(f.VERSAO)!!
    )

    private fun atividade(r: Record) = Atividade(
        r.get(a.ID)!!,
        r.get(a.NATUREZA)!!,
        r.get(a.CATEGORIA_ID)!!,
        r.get(a.FORMATO_ID)!!,
        r.get(a.TITULO)!!,
        r.get(a.OBJETIVO),
        r.get(a.DESCRICAO),
        r.get(a.CARGA_HORARIA)!!,
        Periodo(r.get(a.INICIO)!!, r.get(a.FIM)!!),
        r.get(a.PUBLICO_ALVO)!!,
        r.get(a.VERSAO)!!
    )

    private fun <T> listar(
        tabela: Table<out Record>,
        p: Paginacao,
        condicao: Condition,
        ordem: List<SortField<*>>,
        mapear: (Record) -> T
    ): Pagina<T> {
        val total = banco.sql.fetchCount(tabela, condicao).toLong()
        val itens = banco.sql.selectFrom(tabela).where(condicao).orderBy(ordem).limit(p.tamanho)
            .offset(p.offset).fetch().map(mapear)
        return Pagina(itens, total, p.pagina, p.tamanho)
    }

    override fun categorias(
        paginacao: Paginacao,
        natureza: String?,
        somenteAtivas: Boolean
    ): Pagina<Categoria> = persistencia {
        var condicao = DSL.noCondition()
        if (natureza != null) {
            condicao = condicao.and(c.NATUREZA.eq(natureza))
        }
        if (somenteAtivas) condicao = condicao.and(c.ATIVO.isTrue)
        return listar(c, paginacao, condicao, listOf(c.NOME.asc(), c.ID.asc()), ::categoria)
    }

    override fun categoria(id: UUID) = persistencia {
        banco.sql.selectFrom(c).where(c.ID.eq(id)).fetchOne()?.let(::categoria)
    }

    override fun salvar(categoria: Categoria, autor: UUID, nova: Boolean): Categoria = persistencia {
        val item = categoria
        if (nova) banco.sql.insertInto(c).set(c.ID, item.id).set(c.NATUREZA, item.natureza)
            .set(c.NOME, item.nome.trim()).set(c.DESCRICAO, item.descricao).set(c.ATIVO, item.ativo)
            .set(c.CRIADO_POR, autor).set(c.ATUALIZADO_POR, autor).execute()
        else {
            val anterior = banco.sql.selectFrom(c).where(c.ID.eq(item.id)).forUpdate().fetchOne()
                ?.let(::categoria) ?: ausente()
            if (anterior.versao != item.versao) conflito()
            if (anterior.natureza != item.natureza) exigir(
                !referenciada("categoria_id", item.id),
                "Categoria referenciada não pode mudar de natureza."
            )
            if (banco.sql.update(c).set(c.NATUREZA, item.natureza).set(c.NOME, item.nome.trim())
                    .set(c.DESCRICAO, item.descricao).set(c.ATIVO, item.ativo)
                    .set(c.VERSAO, c.VERSAO.plus(1))
                    .set(c.ATUALIZADO_EM, OffsetDateTime.now(ZoneOffset.UTC))
                    .set(c.ATUALIZADO_POR, autor)
                    .where(c.ID.eq(item.id).and(c.VERSAO.eq(item.versao))).execute() != 1
            ) conflito()
        }
        return categoria(item.id) ?: ausente()
    }

    private fun referenciada(campo: String, id: UUID): Boolean = banco.sql.fetchExists(
        banco.sql.selectOne().from(a)
            .where(if (campo == "categoria_id") a.CATEGORIA_ID.eq(id) else a.FORMATO_ID.eq(id))
    )

    private fun excluirCatalogo(
        tabela: String,
        campo: String,
        id: UUID,
        versao: Long,
        autor: UUID
    ) {
        // Identificadores vêm apenas das constantes internas, nunca de dados HTTP.
        val registro =
            banco.sql.fetchOne("select versao from $tabela where id=? for update", id) ?: ausente()
        if (registro.get("versao", Long::class.java) != versao) conflito()
        if (referenciada(
                campo,
                id
            )
        ) banco.sql.execute(
            "update $tabela set ativo=false,versao=versao+1,atualizado_em=now(),atualizado_por=? where id=?",
            autor,
            id
        )
        else banco.sql.execute("delete from $tabela where id=?", id)
    }

    override fun excluirCategoria(id: UUID, versao: Long, autor: UUID) = persistencia {
        excluirCatalogo("categorias_atividade", "categoria_id", id, versao, autor)
    }

    override fun formatos(paginacao: Paginacao, somenteAtivos: Boolean) = persistencia {
        listar(
            f,
            paginacao,
            if (somenteAtivos) f.ATIVO.isTrue else DSL.noCondition(),
            listOf(f.NOME.asc(), f.ID.asc()),
            ::formato
        )
    }

    override fun formato(id: UUID) = persistencia {
        banco.sql.selectFrom(f).where(f.ID.eq(id)).fetchOne()?.let(::formato)
    }

    override fun salvar(formato: Formato, autor: UUID, novo: Boolean): Formato = persistencia {
        val item = formato
        if (novo) banco.sql.insertInto(f).set(f.ID, item.id).set(f.NOME, item.nome.trim())
            .set(f.DESCRICAO, item.descricao).set(f.ATIVO, item.ativo).set(f.CRIADO_POR, autor)
            .set(f.ATUALIZADO_POR, autor).execute()
        else {
            if (formato(item.id) == null) ausente()
            if (banco.sql.update(f).set(f.NOME, item.nome.trim()).set(f.DESCRICAO, item.descricao)
                    .set(f.ATIVO, item.ativo).set(f.VERSAO, f.VERSAO.plus(1))
                    .set(f.ATUALIZADO_EM, OffsetDateTime.now(ZoneOffset.UTC))
                    .set(f.ATUALIZADO_POR, autor)
                    .where(f.ID.eq(item.id).and(f.VERSAO.eq(item.versao))).execute() != 1
            ) conflito()
        }
        return formato(item.id) ?: ausente()
    }

    override fun excluirFormato(id: UUID, versao: Long, autor: UUID) = persistencia {
        excluirCatalogo("formatos_atividade", "formato_id", id, versao, autor)
    }

    override fun atividades(paginacao: Paginacao, filtro: FiltroAtividade): Pagina<Atividade> = persistencia {
        var condicao = a.EXCLUIDA.isFalse
        filtro.natureza?.let {
            condicao = condicao.and(a.NATUREZA.eq(it))
        }
        filtro.categoriaId?.let { condicao = condicao.and(a.CATEGORIA_ID.eq(it)) }
        filtro.formatoId?.let { condicao = condicao.and(a.FORMATO_ID.eq(it)) }
        filtro.titulo?.takeIf { it.isNotBlank() }?.let {
            condicao =
                condicao.and(
                    DSL.lower(a.TITULO).contains(it.trim().lowercase(java.util.Locale.ROOT))
                )
        }
        return listar(a, paginacao, condicao, listOf(a.INICIO.desc(), a.ID.asc()), ::atividade)
    }

    override fun atividade(id: UUID) = persistencia {
        banco.sql.selectFrom(a).where(a.ID.eq(id).and(a.EXCLUIDA.isFalse)).fetchOne()
            ?.let(::atividade)
    }

    override fun salvar(atividade: Atividade, autor: UUID, nova: Boolean): Atividade = persistencia {
        val item = atividade
        if (nova) banco.sql.insertInto(a).set(a.ID, item.id).set(a.NATUREZA, item.natureza)
            .set(a.CATEGORIA_ID, item.categoriaId).set(a.FORMATO_ID, item.formatoId)
            .set(a.TITULO, item.titulo).set(a.OBJETIVO, item.objetivo)
            .set(a.DESCRICAO, item.descricao).set(a.CARGA_HORARIA, item.cargaHoraria)
            .set(a.INICIO, item.periodo.inicio).set(a.FIM, item.periodo.fim)
            .set(a.PUBLICO_ALVO, item.publicoAlvo).set(a.CRIADO_POR, autor)
            .set(a.ATUALIZADO_POR, autor).execute()
        else if (banco.sql.update(a).set(a.NATUREZA, item.natureza)
                .set(a.CATEGORIA_ID, item.categoriaId).set(a.FORMATO_ID, item.formatoId)
                .set(a.TITULO, item.titulo).set(a.OBJETIVO, item.objetivo)
                .set(a.DESCRICAO, item.descricao).set(a.CARGA_HORARIA, item.cargaHoraria)
                .set(a.INICIO, item.periodo.inicio).set(a.FIM, item.periodo.fim)
                .set(a.PUBLICO_ALVO, item.publicoAlvo).set(a.VERSAO, a.VERSAO.plus(1))
                .set(a.ATUALIZADO_EM, OffsetDateTime.now(ZoneOffset.UTC))
                .set(a.ATUALIZADO_POR, autor)
                .where(a.ID.eq(item.id).and(a.VERSAO.eq(item.versao)).and(a.EXCLUIDA.isFalse))
                .execute() != 1
        ) conflito()
        return atividade(item.id) ?: ausente()
    }

    override fun excluirAtividade(id: UUID, versao: Long, autor: UUID) = persistencia {
        if (atividade(id) == null) ausente()
        if (banco.sql.update(a).set(a.EXCLUIDA, true).set(a.VERSAO, a.VERSAO.plus(1))
                .set(a.ATUALIZADO_EM, OffsetDateTime.now(ZoneOffset.UTC))
                .set(a.ATUALIZADO_POR, autor)
                .where(a.ID.eq(id).and(a.VERSAO.eq(versao)).and(a.EXCLUIDA.isFalse)).execute() != 1
        ) conflito()
    }
}
