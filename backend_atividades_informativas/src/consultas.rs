use crate::{dominio::*, erro::Erro};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool, Postgres, QueryBuilder};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

#[derive(Serialize, FromRow, ToSchema)]
pub struct Classificacao {
    pub id: Uuid,
    pub nome: String,
}

#[derive(Serialize, FromRow, ToSchema)]
pub struct Cartao {
    pub id: Uuid,
    pub titulo: String,
    pub descricao: String,
    pub meio: Meio,
    pub classificacao_id: Uuid,
    pub classificacao: String,
    #[serde(skip)]
    pub created_at: DateTime<Utc>,
}

#[derive(Serialize, FromRow, ToSchema)]
pub struct Detalhe {
    pub id: Uuid,
    pub classificacao: String,
    #[serde(flatten)]
    #[sqlx(flatten)]
    pub cadastro: Cadastro,
    #[sqlx(json)]
    pub periodos: Vec<Periodo>,
}

#[derive(Serialize, FromRow, ToSchema)]
pub struct Ocorrencia {
    pub atividade_id: Uuid,
    pub periodo_id: Uuid,
    pub titulo: String,
    pub descricao: String,
    pub natureza: String,
    pub meio: Meio,
    pub publico_alvo: String,
    pub inicio: DateTime<Utc>,
    pub termino: DateTime<Utc>,
    pub fuso: String,
}

#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct Paginacao {
    /// Quantidade de itens (1 a 100, padrão 20).
    pub limite: Option<i64>,
    /// Token devolvido em proximo_cursor na página anterior.
    pub cursor: Option<String>,
}
#[derive(Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct Janela {
    /// Início inclusivo em RFC 3339.
    pub inicio: DateTime<Utc>,
    /// Término exclusivo em RFC 3339.
    pub termino: DateTime<Utc>,
    pub limite: Option<i64>,
    pub cursor: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct Pagina<T> {
    pub itens: Vec<T>,
    pub proximo_cursor: Option<String>,
}

impl Paginacao {
    fn limite(&self) -> Result<i64, Erro> {
        let limite = self.limite.unwrap_or(20);
        if !(1..=100).contains(&limite) {
            return Err(Erro::Parametro("O limite deve estar entre 1 e 100"));
        }
        Ok(limite)
    }
    fn posicao(&self) -> Result<Option<(DateTime<Utc>, Uuid)>, Erro> {
        let Some(cursor) = &self.cursor else {
            return Ok(None);
        };
        let invalido = Erro::Parametro("Cursor inválido");
        let (data, id) = cursor.split_once('|').ok_or(invalido)?;
        Ok(Some((
            data.parse().map_err(|_| invalido)?,
            id.parse().map_err(|_| invalido)?,
        )))
    }
}

fn pagina<T>(
    mut itens: Vec<T>,
    limite: i64,
    chave: impl Fn(&T) -> (DateTime<Utc>, Uuid),
) -> Pagina<T> {
    let mut proximo_cursor = None;
    if itens.len() > limite as usize {
        itens.pop();
        if let Some(ultimo) = itens.last() {
            let (data, id) = chave(ultimo);
            proximo_cursor = Some(format!("{}|{id}", data.to_rfc3339()));
        }
    }
    Pagina {
        itens,
        proximo_cursor,
    }
}

pub async fn cartoes(db: &PgPool, p: Paginacao, publica: bool) -> Result<Pagina<Cartao>, Erro> {
    let limite = p.limite()?;
    let mut q = QueryBuilder::<Postgres>::new(
        "SELECT a.id, a.titulo, a.descricao, a.meio::text, a.created_at,
        a.classificacao_id, c.nome AS classificacao FROM gpet.atividade a
        JOIN gpet.classificacao c ON c.id=a.classificacao_id WHERE true",
    );
    if publica {
        q.push(" AND a.publicacao_publica");
    }
    if let Some((data, id)) = p.posicao()? {
        q.push(" AND (a.created_at,a.id) < (")
            .push_bind(data)
            .push(",")
            .push_bind(id)
            .push(")");
    }
    q.push(" ORDER BY a.created_at DESC, a.id DESC LIMIT ")
        .push_bind(limite + 1);
    let itens = q.build_query_as().fetch_all(db).await?;
    Ok(pagina(itens, limite, |c: &Cartao| (c.created_at, c.id)))
}

pub async fn detalhe(db: &PgPool, id: Uuid, publica: bool) -> Result<Detalhe, Erro> {
    Ok(sqlx::query_as("SELECT a.id,a.classificacao_id,a.meio::text,a.titulo,a.descricao,a.conteudo,
        a.publico_alvo,a.carga_horaria_minutos,a.publicacao_publica,a.agenda_pesquisa,c.nome AS classificacao,
        (SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'inicio',lower(periodo),
            'termino',upper(periodo),'fuso',fuso) ORDER BY lower(periodo),s.id),'[]'::jsonb)
         FROM gpet.sessao s WHERE atividade_id=a.id) AS periodos
        FROM gpet.atividade a JOIN gpet.classificacao c ON c.id=a.classificacao_id
        WHERE a.id=$1 AND (NOT $2 OR a.publicacao_publica)")
        .bind(id).bind(publica).fetch_one(db).await?)
}

pub async fn agenda(db: &PgPool, j: Janela) -> Result<Pagina<Ocorrencia>, Erro> {
    if j.termino <= j.inicio {
        return Err(Erro::Parametro("Janela inválida"));
    }
    let p = Paginacao {
        limite: j.limite,
        cursor: j.cursor,
    };
    let limite = p.limite()?;
    let mut q = QueryBuilder::<Postgres>::new(
        "SELECT uuidv7_atividade AS atividade_id,uuidv7_periodo AS periodo_id,
        titulo,descricao,natureza,meio,publico_alvo,inicio,termino,fuso FROM gpet.vw_agenda
        WHERE periodo && tstzrange(",
    );
    q.push_bind(j.inicio)
        .push(",")
        .push_bind(j.termino)
        .push(",'[)')");
    if let Some((data, id)) = p.posicao()? {
        q.push(" AND (inicio,uuidv7_periodo) > (")
            .push_bind(data)
            .push(",")
            .push_bind(id)
            .push(")");
    }
    q.push(" ORDER BY inicio,uuidv7_periodo LIMIT ")
        .push_bind(limite + 1);
    let itens = q.build_query_as().fetch_all(db).await?;
    Ok(pagina(itens, limite, |o: &Ocorrencia| {
        (o.inicio, o.periodo_id)
    }))
}
