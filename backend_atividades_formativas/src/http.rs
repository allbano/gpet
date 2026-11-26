use crate::{
    aplicacao::{self, MudancaHorario},
    consultas::{self, *},
    dominio::*,
    erro::{Erro, Mensagem},
};
use axum::{
    Json,
    extract::{OriginalUri, Path, Query, State},
    http::{StatusCode, header},
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};
use uuid::Uuid;

#[derive(Serialize, ToSchema)]
struct Identificador {
    id: Uuid,
}

#[derive(Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
struct Nome {
    #[schema(example = "Oficina")]
    nome: String,
}

fn criado(uri: OriginalUri, id: Uuid) -> Response {
    let location = format!("{}/{id}", uri.path().trim_end_matches('/'));
    (
        StatusCode::CREATED,
        [(header::LOCATION, location)],
        Json(Identificador { id }),
    )
        .into_response()
}

/// Verifica o processo.
#[utoipa::path(
    get,
    path = "/health",
    tag = "Público",
    responses(
        (status = 200, description = "Consulta realizada"),
    )
)]
async fn health() -> Result<StatusCode, Erro> {
    Ok(StatusCode::OK)
}

/// Verifica a conexão com PostgreSQL.
#[utoipa::path(
    get,
    path = "/ready",
    tag = "Público",
    responses(
        (status = 200, description = "Consulta realizada"),
        (status = 503, description = "Banco indisponível", body = Mensagem),
    )
)]
async fn ready(State(db): State<PgPool>) -> Result<StatusCode, Erro> {
    sqlx::query("SELECT 1")
        .execute(&db)
        .await
        .map_err(|_| Erro::Indisponivel)?;
    Ok(StatusCode::OK)
}

/// Lista os cartões publicados.
#[utoipa::path(
    get,
    path = "/atividades",
    tag = "Público",
    params(Paginacao),
    responses(
        (status = 200, description = "Consulta realizada", body = Pagina<Cartao>),
        (status = 400, description = "Parâmetro inválido"),
    )
)]
async fn cartoes(
    State(db): State<PgPool>,
    Query(p): Query<Paginacao>,
) -> Result<Json<Pagina<Cartao>>, Erro> {
    Ok(Json(consultas::cartoes(&db, p, true).await?))
}

/// Consulta atividade e sessões ordenadas.
#[utoipa::path(
    get,
    path = "/atividades/{id}",
    tag = "Público",
    params(("id" = Uuid, Path, description = "UUID do recurso")),
    responses(
        (status = 200, description = "Consulta realizada", body = Detalhe),
        (status = 400, description = "Parâmetro inválido"),
        (status = 404, description = "Recurso ausente", body = Mensagem),
    )
)]
async fn detalhe(State(db): State<PgPool>, Path(id): Path<Uuid>) -> Result<Json<Detalhe>, Erro> {
    Ok(Json(consultas::detalhe(&db, id, true).await?))
}

/// Lista cadastros, incluindo rascunhos. Acesso interno autorizado pelo gateway.
#[utoipa::path(
    get,
    path = "/interno/atividades",
    tag = "Interno",
    params(Paginacao),
    responses(
        (status = 200, description = "Consulta realizada", body = Pagina<Cartao>),
        (status = 400, description = "Parâmetro inválido"),
    )
)]
async fn cadastros(
    State(db): State<PgPool>,
    Query(p): Query<Paginacao>,
) -> Result<Json<Pagina<Cartao>>, Erro> {
    Ok(Json(consultas::cartoes(&db, p, false).await?))
}

/// Consulta atividade e sessões ordenadas. Acesso interno autorizado pelo gateway.
#[utoipa::path(
    get,
    path = "/interno/atividades/{id}",
    tag = "Interno",
    params(("id" = Uuid, Path, description = "UUID do recurso")),
    responses(
        (status = 200, description = "Consulta realizada", body = Detalhe),
        (status = 400, description = "Parâmetro inválido"),
        (status = 404, description = "Recurso ausente", body = Mensagem),
    )
)]
async fn cadastro(State(db): State<PgPool>, Path(id): Path<Uuid>) -> Result<Json<Detalhe>, Erro> {
    Ok(Json(consultas::detalhe(&db, id, false).await?))
}

/// Cria uma atividade. Acesso interno autorizado pelo gateway.
#[utoipa::path(
    post,
    path = "/interno/atividades",
    tag = "Interno",
    request_body = Cadastro,
    responses(
        (status = 201, description = "Recurso criado", body = Identificador, headers(("Location" = String, description = "URI do recurso criado"))),
        (status = 400, description = "Parâmetro inválido"),
        (status = 422, description = "Dados inválidos"),
    )
)]
async fn criar_atividade(
    State(db): State<PgPool>,
    uri: OriginalUri,
    Json(d): Json<Cadastro>,
) -> Result<Response, Erro> {
    let id = aplicacao::criar_atividade(&db, d).await?;
    Ok(criado(uri, id))
}

/// Atualiza os campos enviados e permite publicar. Acesso interno autorizado pelo gateway.
#[utoipa::path(
    patch,
    path = "/interno/atividades/{id}",
    tag = "Interno",
    params(("id" = Uuid, Path, description = "UUID do recurso")),
    request_body = Edicao,
    responses(
        (status = 204, description = "Operação concluída"),
        (status = 400, description = "Parâmetro inválido"),
        (status = 404, description = "Recurso ausente", body = Mensagem),
        (status = 422, description = "Dados inválidos"),
    )
)]
async fn editar_atividade(
    State(db): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(d): Json<Edicao>,
) -> Result<StatusCode, Erro> {
    aplicacao::editar_atividade(&db, id, d).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Exclui atividade e sessões. Acesso interno autorizado pelo gateway.
#[utoipa::path(
    delete,
    path = "/interno/atividades/{id}",
    tag = "Interno",
    params(("id" = Uuid, Path, description = "UUID do recurso")),
    responses(
        (status = 204, description = "Operação concluída"),
        (status = 400, description = "Parâmetro inválido"),
        (status = 404, description = "Recurso ausente", body = Mensagem),
    )
)]
async fn excluir_atividade(
    State(db): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, Erro> {
    aplicacao::excluir_atividade(&db, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Lista sessões da atividade. Acesso interno autorizado pelo gateway.
#[utoipa::path(
    get,
    path = "/interno/atividades/{id}/periodos",
    tag = "Interno",
    params(("id" = Uuid, Path, description = "UUID do recurso")),
    responses(
        (status = 200, description = "Consulta realizada", body = Vec<Periodo>),
        (status = 400, description = "Parâmetro inválido"),
        (status = 404, description = "Recurso ausente", body = Mensagem),
    )
)]
async fn periodos(
    State(db): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<Periodo>>, Erro> {
    Ok(Json(consultas::detalhe(&db, id, false).await?.periodos))
}

/// Adiciona uma sessão. Acesso interno autorizado pelo gateway.
#[utoipa::path(
    post,
    path = "/interno/atividades/{id}/periodos",
    tag = "Interno",
    params(("id" = Uuid, Path, description = "UUID do recurso")),
    request_body = Horario,
    responses(
        (status = 201, description = "Recurso criado", body = Identificador, headers(("Location" = String, description = "URI do recurso criado"))),
        (status = 400, description = "Parâmetro inválido"),
        (status = 404, description = "Recurso ausente", body = Mensagem),
        (status = 422, description = "Dados inválidos"),
    )
)]
async fn adicionar_periodo(
    State(db): State<PgPool>,
    Path(id): Path<Uuid>,
    uri: OriginalUri,
    Json(d): Json<Horario>,
) -> Result<Response, Erro> {
    let s = aplicacao::alterar_programacao(&db, id, MudancaHorario::Adicionar(d)).await?;
    Ok(criado(uri, s))
}

/// Consulta uma sessão desta atividade. Acesso interno autorizado pelo gateway.
#[utoipa::path(
    get,
    path = "/interno/atividades/{id}/periodos/{periodoId}",
    tag = "Interno",
    params(("id" = Uuid, Path, description = "UUID do recurso"),("periodoId" = Uuid, Path, description = "UUID da sessão desta atividade")),
    responses(
        (status = 200, description = "Consulta realizada", body = Periodo),
        (status = 400, description = "Parâmetro inválido"),
        (status = 404, description = "Recurso ausente", body = Mensagem),
    )
)]
async fn periodo(
    State(db): State<PgPool>,
    Path((id, s)): Path<(Uuid, Uuid)>,
) -> Result<Json<Periodo>, Erro> {
    Ok(Json(aplicacao::periodo(&db, id, s).await?))
}

/// Altera a sessão. Acesso interno autorizado pelo gateway.
#[utoipa::path(
    patch,
    path = "/interno/atividades/{id}/periodos/{periodoId}",
    tag = "Interno",
    params(("id" = Uuid, Path, description = "UUID do recurso"),("periodoId" = Uuid, Path, description = "UUID da sessão desta atividade")),
    request_body = EdicaoHorario,
    responses(
        (status = 204, description = "Operação concluída"),
        (status = 400, description = "Parâmetro inválido"),
        (status = 404, description = "Recurso ausente", body = Mensagem),
        (status = 422, description = "Dados inválidos"),
    )
)]
async fn editar_periodo(
    State(db): State<PgPool>,
    Path((id, s)): Path<(Uuid, Uuid)>,
    Json(d): Json<EdicaoHorario>,
) -> Result<StatusCode, Erro> {
    aplicacao::alterar_programacao(&db, id, MudancaHorario::Editar(s, d)).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Remove a sessão. Acesso interno autorizado pelo gateway.
#[utoipa::path(
    delete,
    path = "/interno/atividades/{id}/periodos/{periodoId}",
    tag = "Interno",
    params(("id" = Uuid, Path, description = "UUID do recurso"),("periodoId" = Uuid, Path, description = "UUID da sessão desta atividade")),
    responses(
        (status = 204, description = "Operação concluída"),
        (status = 400, description = "Parâmetro inválido"),
        (status = 404, description = "Recurso ausente", body = Mensagem),
    )
)]
async fn excluir_periodo(
    State(db): State<PgPool>,
    Path((id, s)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, Erro> {
    aplicacao::alterar_programacao(&db, id, MudancaHorario::Remover(s)).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Lista sessões que se sobrepõem à janela solicitada. Acesso interno autorizado pelo gateway.
#[utoipa::path(
    get,
    path = "/interno/agenda",
    tag = "Interno",
    params(Janela),
    responses(
        (status = 200, description = "Consulta realizada", body = Pagina<Ocorrencia>),
        (status = 400, description = "Parâmetro inválido"),
    )
)]
async fn agenda(
    State(db): State<PgPool>,
    Query(p): Query<Janela>,
) -> Result<Json<Pagina<Ocorrencia>>, Erro> {
    Ok(Json(consultas::agenda(&db, p).await?))
}

/// Lista as classificações. Acesso interno autorizado pelo gateway.
#[utoipa::path(
    get,
    path = "/",
    tag = "Interno",
    responses(
        (status = 200, description = "Consulta realizada", body = Vec<Classificacao>),
    )
)]
async fn classificacoes(State(db): State<PgPool>) -> Result<Json<Vec<Classificacao>>, Erro> {
    Ok(Json(aplicacao::classificacoes(&db).await?))
}

/// Cadastra classificação. Acesso interno autorizado pelo gateway.
#[utoipa::path(
    post,
    path = "/",
    tag = "Interno",
    request_body = Nome,
    responses(
        (status = 201, description = "Recurso criado", body = Identificador, headers(("Location" = String, description = "URI do recurso criado"))),
        (status = 400, description = "Parâmetro inválido"),
        (status = 409, description = "Conflito de classificação", body = Mensagem),
        (status = 422, description = "Dados inválidos"),
    )
)]
async fn criar_classificacao(
    State(db): State<PgPool>,
    uri: OriginalUri,
    Json(d): Json<Nome>,
) -> Result<Response, Erro> {
    let id = aplicacao::salvar_classificacao(&db, None, d.nome).await?;
    Ok(criado(uri, id))
}

/// Consulta classificação. Acesso interno autorizado pelo gateway.
#[utoipa::path(
    get,
    path = "/{id}",
    tag = "Interno",
    params(("id" = Uuid, Path, description = "UUID do recurso")),
    responses(
        (status = 200, description = "Consulta realizada", body = Classificacao),
        (status = 400, description = "Parâmetro inválido"),
        (status = 404, description = "Recurso ausente", body = Mensagem),
    )
)]
async fn classificacao(
    State(db): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<Classificacao>, Erro> {
    Ok(Json(aplicacao::classificacao(&db, id).await?))
}

/// Renomeia classificação. Acesso interno autorizado pelo gateway.
#[utoipa::path(
    patch,
    path = "/{id}",
    tag = "Interno",
    params(("id" = Uuid, Path, description = "UUID do recurso")),
    request_body = Nome,
    responses(
        (status = 204, description = "Operação concluída"),
        (status = 400, description = "Parâmetro inválido"),
        (status = 404, description = "Recurso ausente", body = Mensagem),
        (status = 409, description = "Conflito de classificação", body = Mensagem),
        (status = 422, description = "Dados inválidos"),
    )
)]
async fn renomear(
    State(db): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(d): Json<Nome>,
) -> Result<StatusCode, Erro> {
    aplicacao::salvar_classificacao(&db, Some(id), d.nome).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// Exclui uma classificação sem atividades. Acesso interno autorizado pelo gateway.
#[utoipa::path(
    delete,
    path = "/{id}",
    tag = "Interno",
    params(("id" = Uuid, Path, description = "UUID do recurso")),
    responses(
        (status = 204, description = "Operação concluída"),
        (status = 400, description = "Parâmetro inválido"),
        (status = 404, description = "Recurso ausente", body = Mensagem),
        (status = 409, description = "Conflito de classificação", body = Mensagem),
    )
)]
async fn remover_classificacao(
    State(db): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, Erro> {
    aplicacao::excluir_classificacao(&db, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

fn rotas_de_atividades() -> OpenApiRouter<PgPool> {
    OpenApiRouter::new()
        .routes(routes!(cartoes))
        .routes(routes!(detalhe))
        .routes(routes!(cadastros, criar_atividade))
        .routes(routes!(cadastro, editar_atividade, excluir_atividade))
        .routes(routes!(periodos, adicionar_periodo))
        .routes(routes!(periodo, editar_periodo, excluir_periodo))
        .routes(routes!(agenda))
}
fn rotas_de_classificacao() -> OpenApiRouter<PgPool> {
    OpenApiRouter::new()
        .routes(routes!(classificacoes, criar_classificacao))
        .routes(routes!(classificacao, renomear, remover_classificacao))
}
fn sondas() -> OpenApiRouter<PgPool> {
    OpenApiRouter::new()
        .routes(routes!(health))
        .routes(routes!(ready))
}

pub fn rotas() -> OpenApiRouter<PgPool> {
    sondas().nest(
        "/api/v1/formativas",
        rotas_de_atividades().nest("/interno/tipos-atividade", rotas_de_classificacao()),
    )
}
