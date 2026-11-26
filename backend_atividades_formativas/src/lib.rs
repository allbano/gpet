mod aplicacao;
mod consultas;
pub mod dominio;
mod erro;
mod http;
mod infraestrutura;
mod repositorio;

use mimalloc::MiMalloc;
use std::env;

#[global_allocator]
static GLOBAL: MiMalloc = MiMalloc;

pub async fn executar() -> Result<(), Box<dyn std::error::Error>> {
    let (app, mut spec) = http::rotas().split_for_parts();
    spec.info.title = "GPET — atividades formativas".into();
    let comando = env::args().nth(1);
    if comando.as_deref() == Some("openapi") {
        println!("{}", spec.to_pretty_json()?);
        return Ok(());
    }
    let db = infraestrutura::conectar(&sqlx::migrate!("./database/migrations")).await?;
    if comando.as_deref() == Some("migrar") {
        return Ok(());
    }
    if comando.as_deref() == Some("mock") {
        let mut tx = db.begin().await?;
        sqlx::raw_sql(include_str!("../database/0003_mock.sql"))
            .execute(&mut *tx)
            .await?;
        tx.commit().await?;
        return Ok(());
    }
    #[cfg(feature = "swagger")]
    let app =
        app.merge(utoipa_swagger_ui::SwaggerUi::new("/swagger-ui").url("/openapi.json", spec));
    let listener = tokio::net::TcpListener::bind(
        env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".into()),
    )
    .await?;
    axum::serve(listener, app.with_state(db)).await?;
    Ok(())
}
