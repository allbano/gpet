use backend_atividades_informativas::dominio::{EdicaoHorario, Periodo};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[test]
fn sessao_rejeita_edicao_que_elimina_a_duracao() {
    let inicio: DateTime<Utc> = "2026-12-07T08:00:00Z".parse().unwrap();
    let sessao = Periodo {
        id: Uuid::nil(),
        inicio,
        termino: "2026-12-07T12:00:00Z".parse().unwrap(),
        fuso: "UTC".into(),
    };
    let edicao = EdicaoHorario {
        inicio: None,
        termino: Some(inicio),
        fuso: None,
    };
    assert!(sessao.editar(edicao).is_err());
}
