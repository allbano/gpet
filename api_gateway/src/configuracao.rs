use std::env;

/// Configurações de escuta e destinos do API Gateway.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ConfiguracaoGateway {
    pub endereco_escuta: String,
    pub destino_formativas: String,
    pub destino_informativas: String,
}

impl ConfiguracaoGateway {
    /// Retorna a configuração padrão com a porta principal `55569`.
    pub fn padrao() -> Self {
        Self {
            endereco_escuta: "0.0.0.0:55569".to_owned(),
            destino_formativas: "127.0.0.1:8081".to_owned(),
            destino_informativas: "127.0.0.1:8082".to_owned(),
        }
    }

    /// Carrega as configurações a partir das variáveis de ambiente,
    /// aplicando os valores padrão quando ausentes ou vazias.
    pub fn carregar_do_ambiente() -> Self {
        let padrao = Self::padrao();
        Self {
            endereco_escuta: ler_variavel_ou_padrao("BIND_ADDR", padrao.endereco_escuta),
            destino_formativas: ler_variavel_ou_padrao(
                "FORMATIVAS_UPSTREAM",
                padrao.destino_formativas,
            ),
            destino_informativas: ler_variavel_ou_padrao(
                "INFORMATIVAS_UPSTREAM",
                padrao.destino_informativas,
            ),
        }
    }
}

fn ler_variavel_ou_padrao(chave: &str, padrao: String) -> String {
    match env::var(chave) {
        Ok(valor) if !valor.trim().is_empty() => valor.trim().to_owned(),
        _ => padrao,
    }
}

#[cfg(test)]
mod testes {
    use super::ConfiguracaoGateway;

    #[test]
    fn configuracao_padrao_usa_porta_55569() {
        let configuracao = ConfiguracaoGateway::padrao();
        assert_eq!(configuracao.endereco_escuta, "0.0.0.0:55569");
        assert_eq!(configuracao.destino_formativas, "127.0.0.1:8081");
        assert_eq!(configuracao.destino_informativas, "127.0.0.1:8082");
    }
}
