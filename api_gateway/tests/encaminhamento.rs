use axum::Router;
use axum::body::Bytes;
use axum::extract::{OriginalUri, State};
use axum::http::{HeaderMap, Method, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::any;
use serde_json::{Value, json};
use std::collections::HashMap;
use std::net::{SocketAddr, TcpListener as StdTcpListener};
use std::process::{Child, Command, Stdio};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

#[derive(Clone)]
struct EstadoBackendSimulado {
    modulo: &'static str,
    pronto: Arc<AtomicBool>,
}

struct ServidorSimulado {
    endereco: SocketAddr,
    pronto: Arc<AtomicBool>,
    tarefa: tokio::task::JoinHandle<()>,
}

impl Drop for ServidorSimulado {
    fn drop(&mut self) {
        self.tarefa.abort();
    }
}

struct ProcessoGateway {
    filho: Child,
    endereco: SocketAddr,
}

impl Drop for ProcessoGateway {
    fn drop(&mut self) {
        let _ = self.filho.kill();
        let _ = self.filho.wait();
    }
}

struct RespostaHttp {
    status: u16,
    cabecalhos: HashMap<String, String>,
    corpo: Vec<u8>,
}

impl RespostaHttp {
    fn json(&self) -> Value {
        serde_json::from_slice(&self.corpo).expect("corpo da resposta deve ser JSON válido")
    }

    fn cabecalho(&self, nome: &str) -> Option<&str> {
        self.cabecalhos
            .get(&nome.to_ascii_lowercase())
            .map(String::as_str)
    }
}

fn gerar_openapi_simulado(modulo: &str) -> Value {
    let prefixo = format!("/api/v1/{modulo}");
    let classificacao = if modulo == "formativas" {
        "tipos-atividade"
    } else {
        "modalidades"
    };

    json!({
        "openapi": "3.1.0",
        "info": { "title": format!("GPET — atividades {modulo}"), "version": "0.1.0" },
        "paths": {
            "/health": { "get": { "tags": ["Público"], "responses": { "200": { "description": "OK" } } } },
            "/ready": { "get": { "tags": ["Público"], "responses": { "200": { "description": "OK" }, "503": { "description": "Erro", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Mensagem" } } } } } } },
            format!("{prefixo}/atividades"): {
                "get": {
                    "tags": ["Público"],
                    "responses": {
                        "200": { "description": "OK", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PaginaCartao" } } } }
                    }
                }
            },
            format!("{prefixo}/atividades/{{id}}"): {
                "get": {
                    "tags": ["Público"],
                    "responses": {
                        "200": { "description": "OK", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Detalhe" } } } }
                    }
                }
            },
            format!("{prefixo}/interno/agenda"): {
                "get": {
                    "tags": ["Interno"],
                    "responses": {
                        "200": { "description": "OK", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Ocorrencia" } } } }
                    }
                }
            },
            format!("{prefixo}/interno/atividades"): {
                "get": { "tags": ["Interno"], "responses": { "200": { "description": "OK" } } },
                "post": {
                    "tags": ["Interno"],
                    "requestBody": { "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Cadastro" } } } },
                    "responses": { "201": { "description": "Criado", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Identificador" } } } } }
                }
            },
            format!("{prefixo}/interno/{classificacao}"): {
                "get": { "tags": ["Interno"], "responses": { "200": { "description": "OK" } } },
                "post": { "tags": ["Interno"], "responses": { "201": { "description": "Criado" } } }
            }
        },
        "components": {
            "schemas": {
                "Mensagem": { "type": "object" },
                "Cartao": { "type": "object" },
                "PaginaCartao": {
                    "type": "object",
                    "properties": { "itens": { "type": "array", "items": { "$ref": "#/components/schemas/Cartao" } } }
                },
                "Detalhe": { "type": "object" },
                "Ocorrencia": { "type": "object" },
                "Cadastro": { "type": "object" },
                "Identificador": { "type": "object" }
            }
        }
    })
}

async fn iniciar_backend_simulado(modulo: &'static str) -> ServidorSimulado {
    let pronto = Arc::new(AtomicBool::new(true));
    let estado = EstadoBackendSimulado {
        modulo,
        pronto: Arc::clone(&pronto),
    };

    let app = Router::new()
        .route("/health", any(tratar_requisicao_simulada))
        .route("/ready", any(tratar_requisicao_simulada))
        .route("/openapi.json", any(tratar_requisicao_simulada))
        .route("/{*resto}", any(tratar_requisicao_simulada))
        .with_state(estado);

    let ouvinte = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let endereco = ouvinte.local_addr().unwrap();
    let tarefa = tokio::spawn(async move {
        axum::serve(ouvinte, app).await.unwrap();
    });

    ServidorSimulado {
        endereco,
        pronto,
        tarefa,
    }
}

async fn tratar_requisicao_simulada(
    State(estado): State<EstadoBackendSimulado>,
    metodo: Method,
    uri: OriginalUri,
    cabecalhos: HeaderMap,
    corpo: Bytes,
) -> Response {
    let caminho_e_query = uri
        .path_and_query()
        .map(|pq| pq.as_str().to_owned())
        .unwrap_or_else(|| uri.path().to_owned());

    if uri.path() == "/ready" {
        return if estado.pronto.load(Ordering::Relaxed) {
            StatusCode::OK.into_response()
        } else {
            (
                StatusCode::SERVICE_UNAVAILABLE,
                axum::Json(json!({ "mensagem": "Banco indisponível" })),
            )
                .into_response()
        };
    }

    if uri.path() == "/health" {
        return StatusCode::OK.into_response();
    }

    if uri.path() == "/openapi.json" {
        return axum::Json(gerar_openapi_simulado(estado.modulo)).into_response();
    }

    if metodo == Method::POST {
        let id = "019aa000-0001-7000-8000-000000000099";
        let local = format!("{}/{id}", uri.path().trim_end_matches('/'));
        return (
            StatusCode::CREATED,
            [(header::LOCATION, local)],
            axum::Json(json!({
                "id": id,
                "modulo": estado.modulo,
                "caminho_e_query": caminho_e_query,
            })),
        )
            .into_response();
    }

    if metodo == Method::PATCH || metodo == Method::DELETE {
        return StatusCode::NO_CONTENT.into_response();
    }

    let corpo_json: Option<Value> = if corpo.is_empty() {
        None
    } else {
        serde_json::from_slice(&corpo).ok()
    };

    let x_forwarded_host = cabecalhos
        .get("x-forwarded-host")
        .and_then(|v| v.to_str().ok());
    let x_forwarded_proto = cabecalhos
        .get("x-forwarded-proto")
        .and_then(|v| v.to_str().ok());
    let x_forwarded_for = cabecalhos
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok());

    axum::Json(json!({
        "modulo": estado.modulo,
        "metodo": metodo.as_str(),
        "caminho_e_query": caminho_e_query,
        "x_forwarded_host": x_forwarded_host,
        "x_forwarded_proto": x_forwarded_proto,
        "x_forwarded_for": x_forwarded_for,
        "corpo": corpo_json,
    }))
    .into_response()
}

fn reservar_porta_local() -> SocketAddr {
    let ouvinte = StdTcpListener::bind("127.0.0.1:0").unwrap();
    ouvinte.local_addr().unwrap()
}

async fn iniciar_gateway(formativas: SocketAddr, informativas: SocketAddr) -> ProcessoGateway {
    let endereco = reservar_porta_local();
    let binario = env!("CARGO_BIN_EXE_api_gateway");

    let filho = Command::new(binario)
        .env("BIND_ADDR", endereco.to_string())
        .env("FORMATIVAS_UPSTREAM", formativas.to_string())
        .env("INFORMATIVAS_UPSTREAM", informativas.to_string())
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .expect("falha ao iniciar binário do gateway");

    let gateway = ProcessoGateway { filho, endereco };
    aguardar_gateway(endereco).await;
    gateway
}

async fn aguardar_gateway(endereco: SocketAddr) {
    let inicio = Instant::now();
    while inicio.elapsed() < Duration::from_secs(10) {
        if let Ok(resposta) = enviar_requisicao(endereco, "GET", "/health", None).await
            && resposta.status == 200
        {
            return;
        }
        tokio::time::sleep(Duration::from_millis(50)).await;
    }
    panic!("gateway em {endereco} não respondeu a tempo em /health");
}

async fn enviar_requisicao(
    endereco: SocketAddr,
    metodo: &str,
    caminho_e_query: &str,
    corpo_json: Option<&Value>,
) -> std::io::Result<RespostaHttp> {
    let mut conexao = TcpStream::connect(endereco).await?;
    let payload = corpo_json.map(|valor| serde_json::to_vec(valor).unwrap());

    let mut requisicao =
        format!("{metodo} {caminho_e_query} HTTP/1.1\r\nHost: {endereco}\r\nConnection: close\r\n");
    if let Some(ref bytes) = payload {
        requisicao.push_str("Content-Type: application/json\r\n");
        requisicao.push_str(&format!("Content-Length: {}\r\n", bytes.len()));
    }
    requisicao.push_str("\r\n");

    conexao.write_all(requisicao.as_bytes()).await?;
    if let Some(ref bytes) = payload {
        conexao.write_all(bytes).await?;
    }

    let mut bruto = Vec::new();
    let mut trecho = [0u8; 4096];
    let pos_fim_cabecalhos;

    loop {
        let lidos = conexao.read(&mut trecho).await?;
        if lidos == 0 {
            return Err(std::io::Error::new(
                std::io::ErrorKind::UnexpectedEof,
                "resposta HTTP incompleta",
            ));
        }
        bruto.extend_from_slice(&trecho[..lidos]);
        if let Some(pos) = encontrar_fim_cabecalhos(&bruto) {
            pos_fim_cabecalhos = pos;
            break;
        }
    }

    let texto_cabecalhos = String::from_utf8_lossy(&bruto[..pos_fim_cabecalhos]);
    let mut linhas = texto_cabecalhos.split("\r\n");
    let linha_status = linhas.next().unwrap_or("");
    let status: u16 = linha_status
        .split_whitespace()
        .nth(1)
        .and_then(|s| s.parse().ok())
        .expect("linha de status HTTP inválida");

    let mut cabecalhos = HashMap::new();
    for linha in linhas {
        if let Some((nome, valor)) = linha.split_once(':') {
            cabecalhos.insert(nome.trim().to_ascii_lowercase(), valor.trim().to_owned());
        }
    }

    let inicio_corpo = pos_fim_cabecalhos + 4;
    let mut corpo = bruto[inicio_corpo..].to_vec();

    let sem_corpo = metodo == "HEAD" || status == 204 || status == 304;
    if !sem_corpo {
        if let Some(tamanho) = cabecalhos
            .get("content-length")
            .and_then(|v| v.parse::<usize>().ok())
        {
            while corpo.len() < tamanho {
                let lidos = conexao.read(&mut trecho).await?;
                if lidos == 0 {
                    break;
                }
                corpo.extend_from_slice(&trecho[..lidos]);
            }
            corpo.truncate(tamanho);
        } else {
            conexao.read_to_end(&mut corpo).await?;
        }
    } else {
        corpo.clear();
    }

    Ok(RespostaHttp {
        status,
        cabecalhos,
        corpo,
    })
}

fn encontrar_fim_cabecalhos(dados: &[u8]) -> Option<usize> {
    dados.windows(4).position(|janela| janela == b"\r\n\r\n")
}

#[tokio::test]
async fn gateway_centraliza_todas_as_rotas_public_e_private() {
    let formativas = iniciar_backend_simulado("formativas").await;
    let informativas = iniciar_backend_simulado("informativas").await;
    let gateway = iniciar_gateway(formativas.endereco, informativas.endereco).await;

    // 1. Sondas na raiz do gateway e nos prefixos /public/{service}
    assert_eq!(
        enviar_requisicao(gateway.endereco, "GET", "/health", None)
            .await
            .unwrap()
            .status,
        200
    );
    assert_eq!(
        enviar_requisicao(gateway.endereco, "GET", "/ready", None)
            .await
            .unwrap()
            .status,
        200
    );

    informativas.pronto.store(false, Ordering::Relaxed);
    let ready_indisponivel = enviar_requisicao(gateway.endereco, "GET", "/ready", None)
        .await
        .unwrap();
    assert_eq!(ready_indisponivel.status, 503);
    assert_eq!(
        ready_indisponivel.json()["mensagem"],
        "Serviços de atividades indisponíveis"
    );
    informativas.pronto.store(true, Ordering::Relaxed);

    for rota_sonda in [
        "/public/formativas/health",
        "/public/formativas/ready",
        "/public/informativas/health",
        "/public/informativas/ready",
    ] {
        let resp = enviar_requisicao(gateway.endereco, "GET", rota_sonda, None)
            .await
            .unwrap();
        assert_eq!(resp.status, 200, "falha em {rota_sonda}");
    }

    // 2. Rotas GET com reescrita de prefixo /public/{service} e /private/{service}
    let id = "019aa000-0001-7000-8000-000000000001";
    let periodo_id = "019aa000-0002-7000-8000-000000000002";

    let chamadas_get = [
        (
            "/public/formativas/atividades?limite=7",
            "formativas",
            "/api/v1/formativas/atividades?limite=7",
        ),
        (
            &format!("/public/formativas/atividades/{id}"),
            "formativas",
            &format!("/api/v1/formativas/atividades/{id}"),
        ),
        (
            "/private/formativas/agenda?inicio=2026-12-07T00:00:00Z&termino=2026-12-14T00:00:00Z",
            "formativas",
            "/api/v1/formativas/interno/agenda?inicio=2026-12-07T00:00:00Z&termino=2026-12-14T00:00:00Z",
        ),
        (
            "/private/formativas/atividades",
            "formativas",
            "/api/v1/formativas/interno/atividades",
        ),
        (
            &format!("/private/formativas/atividades/{id}"),
            "formativas",
            &format!("/api/v1/formativas/interno/atividades/{id}"),
        ),
        (
            &format!("/private/formativas/atividades/{id}/periodos"),
            "formativas",
            &format!("/api/v1/formativas/interno/atividades/{id}/periodos"),
        ),
        (
            &format!("/private/formativas/atividades/{id}/periodos/{periodo_id}"),
            "formativas",
            &format!("/api/v1/formativas/interno/atividades/{id}/periodos/{periodo_id}"),
        ),
        (
            "/private/formativas/tipos-atividade",
            "formativas",
            "/api/v1/formativas/interno/tipos-atividade",
        ),
        (
            &format!("/private/formativas/tipos-atividade/{id}"),
            "formativas",
            &format!("/api/v1/formativas/interno/tipos-atividade/{id}"),
        ),
        (
            "/public/informativas/atividades?limite=5",
            "informativas",
            "/api/v1/informativas/atividades?limite=5",
        ),
        (
            &format!("/public/informativas/atividades/{id}"),
            "informativas",
            &format!("/api/v1/informativas/atividades/{id}"),
        ),
        (
            "/private/informativas/agenda?inicio=2026-12-07T00:00:00Z&termino=2026-12-14T00:00:00Z",
            "informativas",
            "/api/v1/informativas/interno/agenda?inicio=2026-12-07T00:00:00Z&termino=2026-12-14T00:00:00Z",
        ),
        (
            "/private/informativas/atividades",
            "informativas",
            "/api/v1/informativas/interno/atividades",
        ),
        (
            &format!("/private/informativas/atividades/{id}"),
            "informativas",
            &format!("/api/v1/informativas/interno/atividades/{id}"),
        ),
        (
            &format!("/private/informativas/atividades/{id}/periodos"),
            "informativas",
            &format!("/api/v1/informativas/interno/atividades/{id}/periodos"),
        ),
        (
            &format!("/private/informativas/atividades/{id}/periodos/{periodo_id}"),
            "informativas",
            &format!("/api/v1/informativas/interno/atividades/{id}/periodos/{periodo_id}"),
        ),
        (
            "/private/informativas/modalidades",
            "informativas",
            "/api/v1/informativas/interno/modalidades",
        ),
        (
            &format!("/private/informativas/modalidades/{id}"),
            "informativas",
            &format!("/api/v1/informativas/interno/modalidades/{id}"),
        ),
    ];

    for (rota, modulo_esperado, destino_esperado) in chamadas_get {
        let resp = enviar_requisicao(gateway.endereco, "GET", rota, None)
            .await
            .unwrap();
        assert_eq!(resp.status, 200, "falha em GET {rota}");
        let corpo = resp.json();
        assert_eq!(corpo["modulo"], modulo_esperado);
        assert_eq!(corpo["caminho_e_query"], destino_esperado);
        assert_eq!(corpo["x_forwarded_proto"], "http");
        assert!(corpo["x_forwarded_host"].is_string());
        assert!(corpo["x_forwarded_for"].is_string());
    }

    // 3. Escritas em /private/{service} (POST -> 201 + Location reescrita, PATCH/DELETE -> 204)
    let rotas_post = [
        "/private/formativas/atividades",
        &format!("/private/formativas/atividades/{id}/periodos"),
        "/private/formativas/tipos-atividade",
        "/private/informativas/atividades",
        &format!("/private/informativas/atividades/{id}/periodos"),
        "/private/informativas/modalidades",
    ];
    for rota in rotas_post {
        let resp = enviar_requisicao(
            gateway.endereco,
            "POST",
            rota,
            Some(&json!({ "nome": "Exemplo" })),
        )
        .await
        .unwrap();
        assert_eq!(resp.status, 201, "falha em POST {rota}");
        assert_eq!(
            resp.cabecalho("location"),
            Some(format!("{rota}/019aa000-0001-7000-8000-000000000099").as_str())
        );
    }

    let rotas_recurso = [
        format!("/private/formativas/atividades/{id}"),
        format!("/private/formativas/atividades/{id}/periodos/{periodo_id}"),
        format!("/private/formativas/tipos-atividade/{id}"),
        format!("/private/informativas/atividades/{id}"),
        format!("/private/informativas/atividades/{id}/periodos/{periodo_id}"),
        format!("/private/informativas/modalidades/{id}"),
    ];
    for rota in &rotas_recurso {
        let resp_patch = enviar_requisicao(
            gateway.endereco,
            "PATCH",
            rota,
            Some(&json!({ "titulo": "Atualizado" })),
        )
        .await
        .unwrap();
        assert_eq!(resp_patch.status, 204, "falha em PATCH {rota}");

        let resp_delete = enviar_requisicao(gateway.endereco, "DELETE", rota, None)
            .await
            .unwrap();
        assert_eq!(resp_delete.status, 204, "falha em DELETE {rota}");
    }

    // 4. Rotas desconhecidas (incluindo /api/v1 direto) retornam 404 e método inválido 405 + Allow
    for rota_404 in ["/api/v1/desconhecido", "/api/v1/formativas/atividades"] {
        let nao_encontrada = enviar_requisicao(gateway.endereco, "GET", rota_404, None)
            .await
            .unwrap();
        assert_eq!(nao_encontrada.status, 404);
        assert_eq!(nao_encontrada.json()["mensagem"], "Rota não encontrada");
    }

    let metodo_invalido = enviar_requisicao(
        gateway.endereco,
        "POST",
        "/public/formativas/atividades",
        Some(&json!({})),
    )
    .await
    .unwrap();
    assert_eq!(metodo_invalido.status, 405);
    assert_eq!(metodo_invalido.cabecalho("allow"), Some("GET, HEAD"));
    assert_eq!(metodo_invalido.json()["mensagem"], "Método não permitido");

    // 5. Verificação de Swagger UI e OpenAPI conforme feature
    verificar_swagger(&gateway).await;

    // 6. Upstream indisponível retorna 502 Bad Gateway padronizado
    drop(informativas);
    tokio::time::sleep(Duration::from_millis(50)).await;
    let indisponivel = enviar_requisicao(
        gateway.endereco,
        "GET",
        "/public/informativas/atividades",
        None,
    )
    .await
    .unwrap();
    assert_eq!(indisponivel.status, 502);
    assert_eq!(
        indisponivel.json()["mensagem"],
        "Serviço de atividades indisponível"
    );
}

#[cfg(not(feature = "swagger"))]
async fn verificar_swagger(gateway: &ProcessoGateway) {
    for caminho in [
        "/swagger-ui",
        "/swagger-ui/",
        "/public/formativas/openapi.json",
        "/private/formativas/openapi.json",
        "/public/informativas/openapi.json",
        "/private/informativas/openapi.json",
    ] {
        let resp = enviar_requisicao(gateway.endereco, "GET", caminho, None)
            .await
            .unwrap();
        assert_eq!(resp.status, 404, "esperado 404 sem swagger em {caminho}");
    }
}

#[cfg(feature = "swagger")]
async fn verificar_swagger(gateway: &ProcessoGateway) {
    let redir = enviar_requisicao(gateway.endereco, "GET", "/swagger-ui", None)
        .await
        .unwrap();
    assert_eq!(redir.status, 303);
    assert_eq!(redir.cabecalho("location"), Some("/swagger-ui/"));

    let pagina = enviar_requisicao(gateway.endereco, "GET", "/swagger-ui/", None)
        .await
        .unwrap();
    assert_eq!(pagina.status, 200);
    let html = String::from_utf8_lossy(&pagina.corpo);
    assert!(html.contains("<title>Swagger UI</title>"));
    assert!(html.contains("swagger-initializer.js"));

    let initializer = enviar_requisicao(
        gateway.endereco,
        "GET",
        "/swagger-ui/swagger-initializer.js",
        None,
    )
    .await
    .unwrap();
    assert_eq!(initializer.status, 200);
    let js = String::from_utf8_lossy(&initializer.corpo);
    assert!(js.contains("Formativas — Public"));
    assert!(js.contains("/public/formativas/openapi.json"));
    assert!(js.contains("Formativas — Private"));
    assert!(js.contains("/private/formativas/openapi.json"));
    assert!(js.contains("Informativas — Public"));
    assert!(js.contains("/public/informativas/openapi.json"));
    assert!(js.contains("Informativas — Private"));
    assert!(js.contains("/private/informativas/openapi.json"));

    let fmt_pub = enviar_requisicao(
        gateway.endereco,
        "GET",
        "/public/formativas/openapi.json",
        None,
    )
    .await
    .unwrap();
    assert_eq!(fmt_pub.status, 200);
    let spec_fmt_pub = fmt_pub.json();
    let caminhos_fmt_pub = spec_fmt_pub["paths"].as_object().unwrap();
    assert!(caminhos_fmt_pub.contains_key("/public/formativas/health"));
    assert!(caminhos_fmt_pub.contains_key("/public/formativas/ready"));
    assert!(caminhos_fmt_pub.contains_key("/public/formativas/atividades"));
    assert!(caminhos_fmt_pub.contains_key("/public/formativas/atividades/{id}"));
    assert!(!caminhos_fmt_pub.keys().any(|k| k.starts_with("/private")));
    assert!(!caminhos_fmt_pub.keys().any(|k| k.contains("/api/v1")));
    let schemas_fmt_pub = spec_fmt_pub["components"]["schemas"].as_object().unwrap();
    assert!(schemas_fmt_pub.contains_key("PaginaCartao"));
    assert!(schemas_fmt_pub.contains_key("Cartao"));
    assert!(!schemas_fmt_pub.contains_key("Cadastro"));

    let fmt_priv = enviar_requisicao(
        gateway.endereco,
        "GET",
        "/private/formativas/openapi.json",
        None,
    )
    .await
    .unwrap();
    assert_eq!(fmt_priv.status, 200);
    let spec_fmt_priv = fmt_priv.json();
    let caminhos_fmt_priv = spec_fmt_priv["paths"].as_object().unwrap();
    assert!(caminhos_fmt_priv.contains_key("/private/formativas/agenda"));
    assert!(caminhos_fmt_priv.contains_key("/private/formativas/atividades"));
    assert!(caminhos_fmt_priv.contains_key("/private/formativas/tipos-atividade"));
    assert!(!caminhos_fmt_priv.keys().any(|k| k.starts_with("/public")));
    let schemas_fmt_priv = spec_fmt_priv["components"]["schemas"].as_object().unwrap();
    assert!(schemas_fmt_priv.contains_key("Cadastro"));
    assert!(schemas_fmt_priv.contains_key("Identificador"));
    assert!(!schemas_fmt_priv.contains_key("PaginaCartao"));

    let inf_pub = enviar_requisicao(
        gateway.endereco,
        "GET",
        "/public/informativas/openapi.json",
        None,
    )
    .await
    .unwrap();
    assert_eq!(inf_pub.status, 200);
    let spec_inf_pub = inf_pub.json();
    assert!(
        spec_inf_pub["paths"]
            .as_object()
            .unwrap()
            .contains_key("/public/informativas/atividades")
    );

    let inf_priv = enviar_requisicao(
        gateway.endereco,
        "GET",
        "/private/informativas/openapi.json",
        None,
    )
    .await
    .unwrap();
    assert_eq!(inf_priv.status, 200);
    let spec_inf_priv = inf_priv.json();
    assert!(
        spec_inf_priv["paths"]
            .as_object()
            .unwrap()
            .contains_key("/private/informativas/modalidades")
    );
}
