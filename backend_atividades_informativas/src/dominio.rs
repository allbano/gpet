use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Copy, Clone, Serialize, Deserialize, ToSchema, sqlx::Type)]
#[serde(rename_all = "UPPERCASE")]
#[sqlx(type_name = "text", rename_all = "UPPERCASE")]
pub enum Meio {
    Online,
    Presencial,
    Hibrido,
    Impresso,
}

#[derive(Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Cadastro {
    pub classificacao_id: Uuid,
    pub meio: Meio,
    #[schema(example = "Cartilha de pesquisa")]
    pub titulo: String,
    pub descricao: String,
    #[serde(default)]
    pub conteudo: String,
    pub publico_alvo: String,
    pub carga_horaria_minutos: Option<i32>,
    #[serde(default)]
    pub publicacao_publica: bool,
    #[serde(default)]
    pub agenda_pesquisa: bool,
}

// Em PATCH, null limpa a carga declarada e a ausência preserva o valor.
fn carga_presente<'de, D: serde::Deserializer<'de>>(d: D) -> Result<Option<Option<i32>>, D::Error> {
    Option::<i32>::deserialize(d).map(Some)
}

#[derive(Default, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct Edicao {
    pub classificacao_id: Option<Uuid>,
    pub meio: Option<Meio>,
    pub titulo: Option<String>,
    pub descricao: Option<String>,
    pub conteudo: Option<String>,
    pub publico_alvo: Option<String>,
    #[serde(default, deserialize_with = "carga_presente")]
    #[schema(value_type = Option<i32>)]
    pub carga_horaria_minutos: Option<Option<i32>>,
    pub publicacao_publica: Option<bool>,
    pub agenda_pesquisa: Option<bool>,
}

pub struct AtividadeInformativa {
    cadastro: Cadastro,
}

impl AtividadeInformativa {
    pub fn nova(cadastro: Cadastro) -> Result<Self, &'static str> {
        if [
            &cadastro.titulo,
            &cadastro.descricao,
            &cadastro.publico_alvo,
        ]
        .iter()
        .any(|s| s.trim().is_empty())
        {
            return Err("Preencha título, descrição e público-alvo");
        }
        if cadastro.carga_horaria_minutos.is_some_and(|m| m < 0) {
            return Err("A carga horária deve ser não negativa");
        }
        let mut atividade = Self { cadastro };
        if atividade.cadastro.publicacao_publica {
            atividade.publicar()?;
        }
        Ok(atividade)
    }

    pub fn publicar(&mut self) -> Result<(), &'static str> {
        if self.cadastro.conteudo.trim().is_empty() {
            return Err("Para publicar, preencha o conteúdo");
        }
        self.cadastro.publicacao_publica = true;
        Ok(())
    }

    pub fn editar(self, e: Edicao) -> Result<Self, &'static str> {
        let atual = self.cadastro;
        Self::nova(Cadastro {
            classificacao_id: e.classificacao_id.unwrap_or(atual.classificacao_id),
            meio: e.meio.unwrap_or(atual.meio),
            titulo: e.titulo.unwrap_or(atual.titulo),
            descricao: e.descricao.unwrap_or(atual.descricao),
            conteudo: e.conteudo.unwrap_or(atual.conteudo),
            publico_alvo: e.publico_alvo.unwrap_or(atual.publico_alvo),
            carga_horaria_minutos: e
                .carga_horaria_minutos
                .unwrap_or(atual.carga_horaria_minutos),
            publicacao_publica: e.publicacao_publica.unwrap_or(atual.publicacao_publica),
            agenda_pesquisa: e.agenda_pesquisa.unwrap_or(atual.agenda_pesquisa),
        })
    }
    pub fn cadastro(&self) -> &Cadastro {
        &self.cadastro
    }
}

#[derive(Serialize, Deserialize, FromRow, ToSchema)]
pub struct Periodo {
    pub id: Uuid,
    pub inicio: DateTime<Utc>,
    pub termino: DateTime<Utc>,
    pub fuso: String,
}

#[derive(Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct Horario {
    pub inicio: DateTime<Utc>,
    pub termino: DateTime<Utc>,
    #[serde(default = "fuso_padrao")]
    pub fuso: String,
}
fn fuso_padrao() -> String {
    "America/Sao_Paulo".into()
}

#[derive(Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct EdicaoHorario {
    pub inicio: Option<DateTime<Utc>>,
    pub termino: Option<DateTime<Utc>>,
    pub fuso: Option<String>,
}

impl Periodo {
    pub fn editar(self, edicao: EdicaoHorario) -> Result<Horario, &'static str> {
        let horario = Horario {
            inicio: edicao.inicio.unwrap_or(self.inicio),
            termino: edicao.termino.unwrap_or(self.termino),
            fuso: edicao.fuso.unwrap_or(self.fuso),
        };
        horario.validar()?;
        Ok(horario)
    }
}

impl Horario {
    pub fn validar(&self) -> Result<(), &'static str> {
        if self.termino <= self.inicio {
            return Err("O término deve ser posterior ao início");
        }
        if self.fuso.trim().is_empty() {
            return Err("Informe o fuso horário");
        }
        Ok(())
    }
}
