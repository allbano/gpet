use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Clone, Copy, Debug)]
pub enum Erro {
    Parametro(&'static str),
    Regra(&'static str),
    Ausente,
    Conflito,
    Interno,
    Indisponivel,
}

#[derive(Serialize, ToSchema)]
pub struct Mensagem {
    mensagem: &'static str,
}

impl From<&'static str> for Erro {
    fn from(s: &'static str) -> Self {
        Self::Regra(s)
    }
}
impl From<sqlx::Error> for Erro {
    fn from(e: sqlx::Error) -> Self {
        match &e {
            sqlx::Error::RowNotFound => Self::Ausente,
            sqlx::Error::Database(db) => match db.code().as_deref() {
                Some("23505") => Self::Conflito,
                Some("23503") => Self::Regra("Classificação inexistente"),
                Some("22023") => Self::Regra("Fuso horário inválido"),
                Some("23514" | "22000") => {
                    Self::Regra("Dados incompatíveis com as regras do cadastro")
                }
                _ => {
                    eprintln!("{e}");
                    Self::Interno
                }
            },
            _ => {
                eprintln!("{e}");
                Self::Interno
            }
        }
    }
}
impl IntoResponse for Erro {
    fn into_response(self) -> Response {
        use StatusCode as S;
        let (status, mensagem) = match self {
            Self::Parametro(m) => (S::BAD_REQUEST, m),
            Self::Regra(m) => (S::UNPROCESSABLE_ENTITY, m),
            Self::Ausente => (S::NOT_FOUND, "Recurso não encontrado"),
            Self::Conflito => (S::CONFLICT, "Classificação em uso ou nome já cadastrado"),
            Self::Interno => (S::INTERNAL_SERVER_ERROR, "Falha no serviço"),
            Self::Indisponivel => (S::SERVICE_UNAVAILABLE, "Banco indisponível"),
        };
        (status, Json(Mensagem { mensagem })).into_response()
    }
}
