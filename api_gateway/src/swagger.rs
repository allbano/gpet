use crate::rotas::{Modulo, Visibilidade};
use serde_json::{Map, Value, json};
use std::collections::{HashSet, VecDeque};
use std::sync::Arc;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::time::timeout;
use utoipa_swagger_ui::{Config, Url};

const LIMITE_OPENAPI: Duration = Duration::from_secs(5);
const METODOS_OPENAPI: &[&str] = &[
    "get", "post", "put", "patch", "delete", "options", "head", "trace",
];
const PREFIXO_REF_SCHEMA: &str = "#/components/schemas/";

/// Monta a configuração unificada do Swagger UI separada por serviço e visibilidade.
pub fn construir_configuracao_swagger() -> Arc<Config<'static>> {
    Arc::new(Config::new([
        Url::with_primary(
            "Formativas — Public",
            "/public/formativas/openapi.json",
            true,
        ),
        Url::new("Formativas — Private", "/private/formativas/openapi.json"),
        Url::new("Informativas — Public", "/public/informativas/openapi.json"),
        Url::new(
            "Informativas — Private",
            "/private/informativas/openapi.json",
        ),
    ]))
}

/// Serve um arquivo estático embutido do Swagger UI.
pub fn servir_ativo(
    caminho_relativo: &str,
    config: Arc<Config<'static>>,
) -> Result<Option<(String, Vec<u8>)>, String> {
    let arquivo = utoipa_swagger_ui::serve(caminho_relativo, config)
        .map_err(|erro| format!("Falha ao gerar arquivo do Swagger UI: {erro}"))?;

    Ok(arquivo.map(|item| (item.content_type, item.bytes.into_owned())))
}

/// Busca `/openapi.json` no módulo informado e retorna a especificação filtrada e reescrita.
pub async fn obter_especificacao_filtrada(
    endereco_upstream: &str,
    modulo: Modulo,
    visibilidade: Visibilidade,
) -> Result<Vec<u8>, String> {
    let bruto = timeout(LIMITE_OPENAPI, buscar_openapi_bruto(endereco_upstream))
        .await
        .map_err(|_| "Tempo limite excedido ao consultar OpenAPI do módulo".to_owned())??;

    let spec: Value = serde_json::from_slice(&bruto)
        .map_err(|erro| format!("Especificação OpenAPI inválida recebida do módulo: {erro}"))?;

    let transformada = transformar_especificacao(spec, modulo, visibilidade)?;
    serde_json::to_vec(&transformada)
        .map_err(|erro| format!("Falha ao serializar especificação OpenAPI: {erro}"))
}

async fn buscar_openapi_bruto(endereco_upstream: &str) -> Result<Vec<u8>, String> {
    let mut conexao = TcpStream::connect(endereco_upstream)
        .await
        .map_err(|erro| format!("Falha ao conectar no módulo para ler OpenAPI: {erro}"))?;

    let requisicao = format!(
        "GET /openapi.json HTTP/1.0\r\nHost: {endereco_upstream}\r\nConnection: close\r\n\r\n"
    );
    conexao
        .write_all(requisicao.as_bytes())
        .await
        .map_err(|erro| format!("Falha ao enviar requisição OpenAPI ao módulo: {erro}"))?;

    let mut resposta = Vec::new();
    conexao
        .read_to_end(&mut resposta)
        .await
        .map_err(|erro| format!("Falha ao ler resposta OpenAPI do módulo: {erro}"))?;

    let Some(fim_cabecalhos) = resposta.windows(4).position(|janela| janela == b"\r\n\r\n") else {
        return Err("Resposta HTTP inválida ao consultar OpenAPI do módulo".to_owned());
    };

    let cabecalhos = String::from_utf8_lossy(&resposta[..fim_cabecalhos]);
    let primeira_linha = cabecalhos.lines().next().unwrap_or("");
    if !primeira_linha.starts_with("HTTP/1.1 200 ") && !primeira_linha.starts_with("HTTP/1.0 200 ")
    {
        return Err(format!(
            "Módulo não disponibilizou /openapi.json (status: {primeira_linha})"
        ));
    }

    Ok(resposta[fim_cabecalhos + 4..].to_vec())
}

/// Filtra e reescreve uma especificação OpenAPI 3.1 para o serviço e visibilidade informados.
pub fn transformar_especificacao(
    mut spec: Value,
    modulo: Modulo,
    visibilidade: Visibilidade,
) -> Result<Value, String> {
    let Some(raiz) = spec.as_object_mut() else {
        return Err("Documento OpenAPI precisa ser um objeto JSON".to_owned());
    };

    let tag_nome = format!("{} — {}", modulo.nome(), visibilidade.prefixo_rota());
    let paths_originais = raiz
        .remove("paths")
        .and_then(|v| match v {
            Value::Object(mapa) => Some(mapa),
            _ => None,
        })
        .unwrap_or_default();

    let mut paths_filtrados = Map::new();
    for (caminho, mut item) in paths_originais {
        let Some(novo_caminho) = mapear_caminho_openapi(&caminho, modulo, visibilidade) else {
            continue;
        };
        atualizar_tags_operacoes(&mut item, &tag_nome);
        paths_filtrados.insert(novo_caminho, item);
    }

    let referencias_diretas = coletar_referencias_paths(&paths_filtrados);
    raiz.insert("paths".to_owned(), Value::Object(paths_filtrados));

    atualizar_metadados_documento(raiz, modulo, visibilidade, &tag_nome);
    podar_componentes_nao_utilizados(raiz, &referencias_diretas);

    Ok(spec)
}

fn mapear_caminho_openapi(
    caminho: &str,
    modulo: Modulo,
    visibilidade: Visibilidade,
) -> Option<String> {
    let servico = modulo.nome();
    let prefixo_api = modulo.prefixo_api();
    let prefixo_interno = format!("{prefixo_api}/interno");

    match visibilidade {
        Visibilidade::Public => {
            if caminho == "/health" || caminho == "/ready" {
                return Some(format!("/public/{servico}{caminho}"));
            }
            if caminho == prefixo_interno || caminho.starts_with(&format!("{prefixo_interno}/")) {
                return None;
            }
            caminho
                .strip_prefix(prefixo_api)
                .map(|resto| format!("/public/{servico}{resto}"))
        }
        Visibilidade::Private => caminho
            .strip_prefix(&prefixo_interno)
            .map(|resto| format!("/private/{servico}{resto}")),
    }
}

fn atualizar_tags_operacoes(item_caminho: &mut Value, tag_nome: &str) {
    let Some(objeto) = item_caminho.as_object_mut() else {
        return;
    };

    for metodo in METODOS_OPENAPI {
        if let Some(Value::Object(operacao)) = objeto.get_mut(*metodo) {
            operacao.insert("tags".to_owned(), json!([tag_nome]));
        }
    }
}

fn atualizar_metadados_documento(
    raiz: &mut Map<String, Value>,
    modulo: Modulo,
    visibilidade: Visibilidade,
    tag_nome: &str,
) {
    let titulo = match (modulo, visibilidade) {
        (Modulo::Formativas, Visibilidade::Public) => "GPET — Atividades Formativas (Public)",
        (Modulo::Formativas, Visibilidade::Private) => "GPET — Atividades Formativas (Private)",
        (Modulo::Informativas, Visibilidade::Public) => "GPET — Atividades Informativas (Public)",
        (Modulo::Informativas, Visibilidade::Private) => "GPET — Atividades Informativas (Private)",
    };

    if let Some(Value::Object(info)) = raiz.get_mut("info") {
        info.insert("title".to_owned(), Value::String(titulo.to_owned()));
    } else {
        raiz.insert(
            "info".to_owned(),
            json!({ "title": titulo, "version": "0.1.0" }),
        );
    }

    let descricao_tag = match visibilidade {
        Visibilidade::Public => format!("Endpoints públicos do serviço {}", modulo.nome()),
        Visibilidade::Private => format!("Endpoints privados do serviço {}", modulo.nome()),
    };
    raiz.insert(
        "tags".to_owned(),
        json!([{ "name": tag_nome, "description": descricao_tag }]),
    );
}

fn coletar_referencias_paths(paths: &Map<String, Value>) -> HashSet<String> {
    let mut encontradas = HashSet::new();
    for valor in paths.values() {
        coletar_referencias_recursivamente(valor, &mut encontradas);
    }
    encontradas
}

fn coletar_referencias_recursivamente(valor: &Value, destino: &mut HashSet<String>) {
    match valor {
        Value::Object(mapa) => {
            for (chave, filho) in mapa {
                if chave == "$ref"
                    && let Value::String(referencia) = filho
                    && let Some(nome_schema) = referencia.strip_prefix(PREFIXO_REF_SCHEMA)
                {
                    destino.insert(nome_schema.to_owned());
                }
                coletar_referencias_recursivamente(filho, destino);
            }
        }
        Value::Array(itens) => {
            for item in itens {
                coletar_referencias_recursivamente(item, destino);
            }
        }
        _ => {}
    }
}

fn podar_componentes_nao_utilizados(raiz: &mut Map<String, Value>, diretas: &HashSet<String>) {
    let Some(Value::Object(components)) = raiz.get_mut("components") else {
        return;
    };

    let Some(Value::Object(schemas_originais)) = components.get("schemas").cloned() else {
        return;
    };

    let mut mantidos = HashSet::new();
    let mut fila: VecDeque<String> = diretas.iter().cloned().collect();

    while let Some(nome) = fila.pop_front() {
        if !mantidos.insert(nome.clone()) {
            continue;
        }
        if let Some(definicao) = schemas_originais.get(&nome) {
            let mut transitivas = HashSet::new();
            coletar_referencias_recursivamente(definicao, &mut transitivas);
            for proximo in transitivas {
                if !mantidos.contains(&proximo) {
                    fila.push_back(proximo);
                }
            }
        }
    }

    let schemas_filtrados: Map<String, Value> = schemas_originais
        .into_iter()
        .filter(|(nome, _)| mantidos.contains(nome))
        .collect();

    if schemas_filtrados.is_empty() {
        components.remove("schemas");
    } else {
        components.insert("schemas".to_owned(), Value::Object(schemas_filtrados));
    }

    if components.is_empty() {
        raiz.remove("components");
    }
}
