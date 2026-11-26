use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::time::timeout;

const LIMITE_SONDA: Duration = Duration::from_secs(3);

/// Verifica se ambos os módulos estão prontos para receber tráfego.
pub async fn verificar_prontidao_completa(formativas: &str, informativas: &str) -> bool {
    let (formativas_pronto, informativas_pronto) = tokio::join!(
        verificar_prontidao_modulo(formativas),
        verificar_prontidao_modulo(informativas),
    );
    formativas_pronto && informativas_pronto
}

/// Consulta `GET /ready` em um módulo e confirma resposta HTTP 200.
pub async fn verificar_prontidao_modulo(endereco_upstream: &str) -> bool {
    timeout(LIMITE_SONDA, consultar_ready(endereco_upstream))
        .await
        .unwrap_or(false)
}

async fn consultar_ready(endereco_upstream: &str) -> bool {
    let Ok(mut conexao) = TcpStream::connect(endereco_upstream).await else {
        return false;
    };

    let requisicao =
        format!("GET /ready HTTP/1.1\r\nHost: {endereco_upstream}\r\nConnection: close\r\n\r\n");
    if conexao.write_all(requisicao.as_bytes()).await.is_err() {
        return false;
    }

    let mut buffer = [0u8; 64];
    let Ok(lidos) = conexao.read(&mut buffer).await else {
        return false;
    };
    if lidos == 0 {
        return false;
    }

    let primeira_linha = String::from_utf8_lossy(&buffer[..lidos]);
    primeira_linha.starts_with("HTTP/1.1 200 ") || primeira_linha.starts_with("HTTP/1.0 200 ")
}
