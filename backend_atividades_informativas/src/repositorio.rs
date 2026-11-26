use crate::{dominio::*, erro::Erro};
use sqlx::{Executor, PgConnection, Postgres};
use uuid::Uuid;

pub async fn salvar_atividade(
    db: impl Executor<'_, Database = Postgres>,
    id: Option<Uuid>,
    atividade: &AtividadeInformativa,
) -> Result<Uuid, Erro> {
    let cadastro = atividade.cadastro();
    let sql = if id.is_some() {
        "UPDATE gpet.atividade SET classificacao_id=$1,meio=$2::text::gpet.meio_transmissao,
        titulo=$3,descricao=$4,conteudo=$5,publico_alvo=$6,carga_horaria_minutos=$7,
        publicacao_publica=$8,agenda_pesquisa=$9 WHERE id=$10 RETURNING id"
    } else {
        "INSERT INTO gpet.atividade (classificacao_id,meio,titulo,descricao,conteudo,publico_alvo,
        carga_horaria_minutos,publicacao_publica,agenda_pesquisa)
        VALUES ($1,$2::text::gpet.meio_transmissao,$3,$4,$5,$6,$7,$8,$9) RETURNING id"
    };
    let mut consulta = sqlx::query_scalar(sql)
        .bind(cadastro.classificacao_id)
        .bind(cadastro.meio)
        .bind(&cadastro.titulo)
        .bind(&cadastro.descricao)
        .bind(&cadastro.conteudo)
        .bind(&cadastro.publico_alvo)
        .bind(cadastro.carga_horaria_minutos)
        .bind(cadastro.publicacao_publica)
        .bind(cadastro.agenda_pesquisa);
    if let Some(id) = id {
        consulta = consulta.bind(id);
    }
    Ok(consulta.fetch_one(db).await?)
}

pub async fn bloquear_cadastro(conexao: &mut PgConnection, id: Uuid) -> Result<Cadastro, Erro> {
    Ok(sqlx::query_as(
        "SELECT classificacao_id,meio::text,titulo,descricao,conteudo,
        publico_alvo,carga_horaria_minutos,publicacao_publica,agenda_pesquisa
        FROM gpet.atividade WHERE id=$1 FOR UPDATE",
    )
    .bind(id)
    .fetch_one(conexao)
    .await?)
}
