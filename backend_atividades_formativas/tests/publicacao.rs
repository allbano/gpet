use backend_atividades_formativas::dominio::{AtividadeFormativa, Cadastro, Meio};
use uuid::Uuid;

fn rascunho(conteudo: &str) -> AtividadeFormativa {
    let cadastro = Cadastro {
        titulo: "Pesquisa".into(),
        descricao: "Resumo".into(),
        conteudo: conteudo.into(),
        publico_alvo: "Comunidade".into(),
        meio: Meio::Online,
        classificacao_id: Uuid::nil(),
        publicacao_publica: false,
        agenda_pesquisa: false,
        carga_horaria_minutos: None,
    };
    AtividadeFormativa::nova(cadastro).unwrap()
}

#[test]
fn publicar_exige_conteudo() {
    let mut atividade = rascunho("  ");
    assert!(atividade.publicar().is_err());
    assert!(!atividade.cadastro().publicacao_publica);
}

#[test]
fn publicar_preserva_visibilidade_da_agenda() {
    let mut atividade = rascunho("Material de pesquisa");
    atividade.publicar().unwrap();
    assert!(atividade.cadastro().publicacao_publica);
    assert!(!atividade.cadastro().agenda_pesquisa);
}
