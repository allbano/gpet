#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    backend_atividades_informativas::executar().await
}
