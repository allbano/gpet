use crate::repositorio;
use crate::{consultas::Classificacao, dominio::*, erro::Erro};
use sqlx::PgPool;
use uuid::Uuid;

pub async fn criar_atividade(db: &PgPool, cadastro: Cadastro) -> Result<Uuid, Erro> {
    let atividade = AtividadeInformativa::nova(cadastro)?;
    repositorio::salvar_atividade(db, None, &atividade).await
}

pub async fn editar_atividade(db: &PgPool, id: Uuid, edicao: Edicao) -> Result<(), Erro> {
    let mut transacao = db.begin().await?;
    let cadastro = repositorio::bloquear_cadastro(&mut transacao, id).await?;
    let atividade = AtividadeInformativa::nova(cadastro)?.editar(edicao)?;
    repositorio::salvar_atividade(&mut *transacao, Some(id), &atividade).await?;
    transacao.commit().await?;
    Ok(())
}

pub async fn excluir_atividade(db: &PgPool, id: Uuid) -> Result<(), Erro> {
    sqlx::query("DELETE FROM gpet.atividade WHERE id=$1 RETURNING id")
        .bind(id)
        .fetch_one(db)
        .await?;
    Ok(())
}

pub enum MudancaHorario {
    Adicionar(Horario),
    Editar(Uuid, EdicaoHorario),
    Remover(Uuid),
}

pub async fn alterar_programacao(
    db: &PgPool,
    id: Uuid,
    mudanca: MudancaHorario,
) -> Result<Uuid, Erro> {
    let mut transacao = db.begin().await?;
    sqlx::query("SELECT id FROM gpet.atividade WHERE id=$1 FOR UPDATE")
        .bind(id)
        .fetch_one(&mut *transacao)
        .await?;
    let sessao = match mudanca {
        MudancaHorario::Adicionar(horario) => {
            horario.validar()?;
            sqlx::query_scalar(
                "INSERT INTO gpet.sessao (atividade_id,periodo,fuso)
              VALUES ($1,tstzrange($2,$3,'[)'),$4) RETURNING id",
            )
            .bind(id)
            .bind(horario.inicio)
            .bind(horario.termino)
            .bind(horario.fuso)
            .fetch_one(&mut *transacao)
            .await?
        }
        MudancaHorario::Editar(periodo_id, edicao) => {
            let atual: Periodo = sqlx::query_as(PERIODO)
                .bind(id)
                .bind(periodo_id)
                .fetch_one(&mut *transacao)
                .await?;
            let horario = atual.editar(edicao)?;
            sqlx::query(
                "UPDATE gpet.sessao SET periodo=tstzrange($3,$4,'[)'), fuso=$5
              WHERE atividade_id=$1 AND id=$2 RETURNING id",
            )
            .bind(id)
            .bind(periodo_id)
            .bind(horario.inicio)
            .bind(horario.termino)
            .bind(horario.fuso)
            .fetch_one(&mut *transacao)
            .await?;
            periodo_id
        }
        MudancaHorario::Remover(periodo_id) => {
            sqlx::query("DELETE FROM gpet.sessao WHERE atividade_id=$1 AND id=$2 RETURNING id")
                .bind(id)
                .bind(periodo_id)
                .fetch_one(&mut *transacao)
                .await?;
            periodo_id
        }
    };
    sqlx::query("UPDATE gpet.atividade SET updated_at=statement_timestamp() WHERE id=$1")
        .bind(id)
        .execute(&mut *transacao)
        .await?;
    transacao.commit().await?;
    Ok(sessao)
}

const PERIODO: &str = "SELECT id, lower(periodo) AS inicio, upper(periodo) AS termino, fuso
    FROM gpet.sessao WHERE atividade_id=$1 AND id=$2";

pub async fn periodo(db: &PgPool, id: Uuid, periodo_id: Uuid) -> Result<Periodo, Erro> {
    Ok(sqlx::query_as(PERIODO)
        .bind(id)
        .bind(periodo_id)
        .fetch_one(db)
        .await?)
}

pub async fn classificacoes(db: &PgPool) -> Result<Vec<Classificacao>, Erro> {
    Ok(
        sqlx::query_as("SELECT id,nome FROM gpet.classificacao ORDER BY nome,id")
            .fetch_all(db)
            .await?,
    )
}
pub async fn classificacao(db: &PgPool, id: Uuid) -> Result<Classificacao, Erro> {
    Ok(
        sqlx::query_as("SELECT id,nome FROM gpet.classificacao WHERE id=$1")
            .bind(id)
            .fetch_one(db)
            .await?,
    )
}
pub async fn salvar_classificacao(
    db: &PgPool,
    id: Option<Uuid>,
    nome: String,
) -> Result<Uuid, Erro> {
    let nome = nome.trim();
    if nome.is_empty() {
        return Err(Erro::Regra("Preencha o nome da classificação"));
    }
    if let Some(id) = id {
        Ok(
            sqlx::query_scalar("UPDATE gpet.classificacao SET nome=$1 WHERE id=$2 RETURNING id")
                .bind(nome)
                .bind(id)
                .fetch_one(db)
                .await?,
        )
    } else {
        Ok(
            sqlx::query_scalar("INSERT INTO gpet.classificacao (nome) VALUES ($1) RETURNING id")
                .bind(nome)
                .fetch_one(db)
                .await?,
        )
    }
}
pub async fn excluir_classificacao(db: &PgPool, id: Uuid) -> Result<(), Erro> {
    let r = sqlx::query("DELETE FROM gpet.classificacao WHERE id=$1 RETURNING id")
        .bind(id)
        .fetch_one(db)
        .await;
    if let Err(sqlx::Error::Database(e)) = &r
        && matches!(e.code().as_deref(), Some("23503" | "23001"))
    {
        return Err(Erro::Conflito);
    }
    r?;
    Ok(())
}
