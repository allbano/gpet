use crate::configuracao::ConfiguracaoGateway;
use crate::rotas::{self, AcaoRota, DecisaoRoteamento, MapeamentoLocalizacao, Modulo};
use crate::sondas;
#[cfg(feature = "swagger")]
use crate::swagger;
use async_trait::async_trait;
use bytes::Bytes;
use http::Uri;
use pingora::http::ResponseHeader;
use pingora::prelude::*;
use pingora::proxy::{FailToProxy, ProxyHttp, Session};
use pingora::{ErrorSource, ErrorType};
#[cfg(feature = "swagger")]
use std::sync::Arc;
use tokio::net::lookup_host;
#[cfg(feature = "swagger")]
use utoipa_swagger_ui::Config;

/// Contexto por requisição HTTP processada pelo gateway.
#[derive(Default)]
pub struct ContextoRequisicao {
    modulo: Option<Modulo>,
    caminho_destino: Option<String>,
    mapeamento_localizacao: Option<MapeamentoLocalizacao>,
}

/// Serviço de proxy reverso baseado em Pingora para os backends do GPET.
pub struct GatewayGpet {
    configuracao: ConfiguracaoGateway,
    #[cfg(feature = "swagger")]
    swagger_config: Arc<Config<'static>>,
}

impl GatewayGpet {
    pub fn novo(configuracao: ConfiguracaoGateway) -> Self {
        Self {
            configuracao,
            #[cfg(feature = "swagger")]
            swagger_config: swagger::construir_configuracao_swagger(),
        }
    }

    fn endereco_modulo(&self, modulo: Modulo) -> &str {
        match modulo {
            Modulo::Formativas => &self.configuracao.destino_formativas,
            Modulo::Informativas => &self.configuracao.destino_informativas,
        }
    }
}

#[async_trait]
impl ProxyHttp for GatewayGpet {
    type CTX = ContextoRequisicao;

    fn new_ctx(&self) -> Self::CTX {
        ContextoRequisicao::default()
    }

    async fn request_filter(&self, session: &mut Session, ctx: &mut Self::CTX) -> Result<bool> {
        let cabecalho = session.req_header();
        let metodo = cabecalho.method.as_str();
        let caminho = cabecalho.uri.path();
        let apenas_cabecalho = metodo == "HEAD";

        match rotas::classificar_requisicao(metodo, caminho) {
            DecisaoRoteamento::Atender(AcaoRota::SondaVivaGateway) => {
                responder_vazio(session, 200).await?;
                Ok(true)
            }
            DecisaoRoteamento::Atender(AcaoRota::SondaProntidaoGateway) => {
                let pronto = sondas::verificar_prontidao_completa(
                    &self.configuracao.destino_formativas,
                    &self.configuracao.destino_informativas,
                )
                .await;
                if pronto {
                    responder_vazio(session, 200).await?;
                } else {
                    responder_json_erro(
                        session,
                        503,
                        "Serviços de atividades indisponíveis",
                        None,
                        apenas_cabecalho,
                    )
                    .await?;
                }
                Ok(true)
            }
            #[cfg(feature = "swagger")]
            DecisaoRoteamento::Atender(AcaoRota::RedirecionarSwaggerUi) => {
                responder_redirecionamento(session, 303, "/swagger-ui/").await?;
                Ok(true)
            }
            #[cfg(feature = "swagger")]
            DecisaoRoteamento::Atender(AcaoRota::ServirArquivoSwagger { arquivo }) => {
                match swagger::servir_ativo(&arquivo, Arc::clone(&self.swagger_config)) {
                    Ok(Some((tipo_conteudo, bytes))) => {
                        responder_bytes(session, 200, &tipo_conteudo, bytes, apenas_cabecalho)
                            .await?;
                    }
                    Ok(None) => {
                        responder_json_erro(
                            session,
                            404,
                            "Arquivo do Swagger UI não encontrado",
                            None,
                            apenas_cabecalho,
                        )
                        .await?;
                    }
                    Err(_) => {
                        responder_json_erro(
                            session,
                            500,
                            "Falha ao gerar documentação Swagger UI",
                            None,
                            apenas_cabecalho,
                        )
                        .await?;
                    }
                }
                Ok(true)
            }
            #[cfg(feature = "swagger")]
            DecisaoRoteamento::Atender(AcaoRota::ServirOpenApi {
                modulo,
                visibilidade,
            }) => {
                let endereco = self.endereco_modulo(modulo);
                match swagger::obter_especificacao_filtrada(endereco, modulo, visibilidade).await {
                    Ok(json_bytes) => {
                        responder_bytes(
                            session,
                            200,
                            "application/json",
                            json_bytes,
                            apenas_cabecalho,
                        )
                        .await?;
                    }
                    Err(_) => {
                        responder_json_erro(
                            session,
                            502,
                            "Especificação OpenAPI do módulo indisponível",
                            None,
                            apenas_cabecalho,
                        )
                        .await?;
                    }
                }
                Ok(true)
            }
            DecisaoRoteamento::Atender(AcaoRota::Encaminhar {
                modulo,
                caminho_destino,
                mapeamento_localizacao,
            }) => {
                ctx.modulo = Some(modulo);
                ctx.caminho_destino = Some(caminho_destino);
                ctx.mapeamento_localizacao = mapeamento_localizacao;
                Ok(false)
            }
            DecisaoRoteamento::MetodoNaoPermitido { permitidos } => {
                let cabecalho_allow = permitidos.join(", ");
                responder_json_erro(
                    session,
                    405,
                    "Método não permitido",
                    Some(&cabecalho_allow),
                    apenas_cabecalho,
                )
                .await?;
                Ok(true)
            }
            DecisaoRoteamento::NaoEncontrada => {
                responder_json_erro(session, 404, "Rota não encontrada", None, apenas_cabecalho)
                    .await?;
                Ok(true)
            }
        }
    }

    async fn upstream_peer(
        &self,
        _session: &mut Session,
        ctx: &mut Self::CTX,
    ) -> Result<Box<HttpPeer>> {
        let modulo = ctx.modulo.ok_or_else(|| {
            Error::explain(
                ErrorType::InternalError,
                "Módulo de destino ausente no contexto da requisição",
            )
        })?;
        let endereco = self.endereco_modulo(modulo);

        let mut enderecos = lookup_host(endereco).await.map_err(|erro| {
            Error::because(
                ErrorType::ConnectError,
                "Falha ao resolver endereço do módulo",
                erro,
            )
        })?;

        let socket_addr = enderecos.next().ok_or_else(|| {
            Error::explain(
                ErrorType::ConnectError,
                "Nenhum endereço retornado para o módulo",
            )
        })?;

        Ok(Box::new(HttpPeer::new(socket_addr, false, String::new())))
    }

    async fn upstream_request_filter(
        &self,
        session: &mut Session,
        upstream_request: &mut RequestHeader,
        ctx: &mut Self::CTX,
    ) -> Result<()> {
        if let Some(caminho_destino) = ctx.caminho_destino.as_deref()
            && caminho_destino != upstream_request.uri.path()
        {
            let caminho_e_query = match upstream_request.uri.query() {
                Some(query) => format!("{caminho_destino}?{query}"),
                None => caminho_destino.to_owned(),
            };
            let nova_uri = Uri::builder()
                .path_and_query(caminho_e_query)
                .build()
                .map_err(|erro| {
                    Error::because(
                        ErrorType::InternalError,
                        "Falha ao construir URI de destino",
                        erro,
                    )
                })?;
            upstream_request.set_uri(nova_uri);
        }

        if let Some(host_original) = session
            .req_header()
            .headers
            .get("host")
            .and_then(|valor| valor.to_str().ok())
            .map(str::to_owned)
        {
            upstream_request.insert_header("X-Forwarded-Host", host_original)?;
        }

        upstream_request.insert_header("X-Forwarded-Proto", "http")?;

        if let Some(ip_cliente) = session
            .client_addr()
            .and_then(|addr| addr.as_inet())
            .map(|inet| inet.ip().to_string())
        {
            upstream_request.insert_header("X-Forwarded-For", ip_cliente)?;
        }

        if let Some(modulo) = ctx.modulo {
            let destino = self.endereco_modulo(modulo);
            upstream_request.insert_header("Host", destino)?;
        }

        Ok(())
    }

    async fn upstream_response_filter(
        &self,
        _session: &mut Session,
        upstream_response: &mut ResponseHeader,
        ctx: &mut Self::CTX,
    ) -> Result<()> {
        let Some(mapeamento) = ctx.mapeamento_localizacao else {
            return Ok(());
        };

        let Some(local_atual) = upstream_response
            .headers
            .get("location")
            .and_then(|valor| valor.to_str().ok())
            .map(str::to_owned)
        else {
            return Ok(());
        };

        if let Some(sufixo) = local_atual.strip_prefix(mapeamento.prefixo_interno)
            && (sufixo.is_empty() || sufixo.starts_with('/'))
        {
            let local_reescrito = format!("{}{sufixo}", mapeamento.prefixo_externo);
            upstream_response.insert_header("Location", local_reescrito)?;
        }

        Ok(())
    }

    async fn fail_to_proxy(
        &self,
        session: &mut Session,
        e: &Error,
        _ctx: &mut Self::CTX,
    ) -> FailToProxy {
        let (codigo, mensagem) = mapear_erro_proxy(e);
        let apenas_cabecalho = session.req_header().method == "HEAD";

        if codigo > 0 && session.response_written().is_none() {
            let _ = responder_json_erro(session, codigo, mensagem, None, apenas_cabecalho).await;
        }

        FailToProxy {
            error_code: codigo,
            can_reuse_downstream: false,
        }
    }
}

fn mapear_erro_proxy(erro: &Error) -> (u16, &'static str) {
    match erro.etype() {
        ErrorType::HTTPStatus(codigo) => (*codigo, "Falha ao encaminhar requisição"),
        ErrorType::ConnectTimedout | ErrorType::ReadTimedout | ErrorType::WriteTimedout => (
            504,
            "Tempo limite excedido ao consultar o serviço de atividades",
        ),
        _ => match erro.esource() {
            ErrorSource::Upstream => (502, "Serviço de atividades indisponível"),
            ErrorSource::Downstream => match erro.etype() {
                ErrorType::WriteError | ErrorType::ReadError | ErrorType::ConnectionClosed => {
                    (0, "")
                }
                _ => (400, "Requisição inválida"),
            },
            ErrorSource::Internal | ErrorSource::Unset => (500, "Falha interna no gateway"),
        },
    }
}

async fn responder_vazio(session: &mut Session, status: u16) -> Result<()> {
    let mut resposta = ResponseHeader::build(status, Some(1))?;
    resposta.insert_header("Content-Length", "0")?;
    session
        .write_response_header(Box::new(resposta), true)
        .await?;
    Ok(())
}

#[cfg(feature = "swagger")]
async fn responder_redirecionamento(
    session: &mut Session,
    status: u16,
    destino: &str,
) -> Result<()> {
    let mut resposta = ResponseHeader::build(status, Some(2))?;
    resposta.insert_header("Location", destino)?;
    resposta.insert_header("Content-Length", "0")?;
    session
        .write_response_header(Box::new(resposta), true)
        .await?;
    Ok(())
}

#[cfg(feature = "swagger")]
async fn responder_bytes(
    session: &mut Session,
    status: u16,
    tipo_conteudo: &str,
    corpo: Vec<u8>,
    apenas_cabecalho: bool,
) -> Result<()> {
    let tamanho = corpo.len().to_string();
    let mut resposta = ResponseHeader::build(status, Some(2))?;
    resposta.insert_header("Content-Type", tipo_conteudo)?;
    resposta.insert_header("Content-Length", tamanho)?;

    session
        .write_response_header(Box::new(resposta), apenas_cabecalho)
        .await?;
    if !apenas_cabecalho {
        session
            .write_response_body(Some(Bytes::from(corpo)), true)
            .await?;
    }
    Ok(())
}

async fn responder_json_erro(
    session: &mut Session,
    status: u16,
    mensagem: &str,
    allow: Option<&str>,
    apenas_cabecalho: bool,
) -> Result<()> {
    let corpo = format!("{{\"mensagem\":\"{}\"}}", escapar_json(mensagem));
    let tamanho = corpo.len().to_string();

    let mut resposta = ResponseHeader::build(status, Some(3))?;
    resposta.insert_header("Content-Type", "application/json")?;
    resposta.insert_header("Content-Length", tamanho)?;
    if let Some(metodos) = allow {
        resposta.insert_header("Allow", metodos)?;
    }

    session
        .write_response_header(Box::new(resposta), apenas_cabecalho)
        .await?;
    if !apenas_cabecalho {
        session
            .write_response_body(Some(Bytes::from(corpo)), true)
            .await?;
    }
    Ok(())
}

fn escapar_json(texto: &str) -> String {
    let mut saida = String::with_capacity(texto.len());
    for caractere in texto.chars() {
        match caractere {
            '"' => saida.push_str("\\\""),
            '\\' => saida.push_str("\\\\"),
            '\n' => saida.push_str("\\n"),
            '\r' => saida.push_str("\\r"),
            '\t' => saida.push_str("\\t"),
            outro => saida.push(outro),
        }
    }
    saida
}
