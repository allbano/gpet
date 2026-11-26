use sqlx::{PgPool, migrate::Migrator, postgres::PgConnectOptions};
use std::{env, fs};

pub async fn conectar(migracoes: &Migrator) -> Result<PgPool, Box<dyn std::error::Error>> {
    let mut options: PgConnectOptions = env::var("DATABASE_URL")?.parse()?;
    if let Ok(arquivo) = env::var("DATABASE_PASSWORD_FILE") {
        options = options.password(fs::read_to_string(arquivo)?.trim_end());
    }
    // O usuário "gpet" também nomeia o schema de negócio. Mantenha o
    // histórico do SQLx no mesmo schema antes e depois da primeira migração.
    let db = PgPool::connect_with(options.options([("search_path", "public")])).await?;
    migracoes.run(&db).await?;
    Ok(db)
}
