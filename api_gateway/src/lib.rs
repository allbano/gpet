pub mod configuracao;
pub mod proxy;
pub mod rotas;
pub mod sondas;
#[cfg(feature = "swagger")]
pub mod swagger;

use configuracao::ConfiguracaoGateway;
use mimalloc::MiMalloc;
use pingora::proxy::http_proxy_service;
use pingora::server::Server;
use proxy::GatewayGpet;

#[global_allocator]
static GLOBAL: MiMalloc = MiMalloc;

/// Inicializa o servidor Pingora e escuta na porta configurada do gateway.
pub fn executar() -> Result<(), Box<dyn std::error::Error>> {
    let configuracao = ConfiguracaoGateway::carregar_do_ambiente();
    let mut servidor = Server::new(None)?;
    servidor.bootstrap();

    let mut servico_proxy = http_proxy_service(
        &servidor.configuration,
        GatewayGpet::novo(configuracao.clone()),
    );
    servico_proxy.add_tcp(&configuracao.endereco_escuta);

    servidor.add_service(servico_proxy);
    servidor.run_forever();
}
