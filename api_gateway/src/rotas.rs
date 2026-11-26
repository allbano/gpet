/// Módulos de backend atendidos pelo gateway.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Modulo {
    Formativas,
    Informativas,
}

impl Modulo {
    pub fn nome(self) -> &'static str {
        match self {
            Self::Formativas => "formativas",
            Self::Informativas => "informativas",
        }
    }

    pub fn prefixo_api(self) -> &'static str {
        match self {
            Self::Formativas => "/api/v1/formativas",
            Self::Informativas => "/api/v1/informativas",
        }
    }
}

/// Visibilidade de exposição da rota no gateway.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Visibilidade {
    Public,
    Private,
}

impl Visibilidade {
    pub fn prefixo_rota(self) -> &'static str {
        match self {
            Self::Public => "public",
            Self::Private => "private",
        }
    }
}

/// Mapeamento usado para reescrever o cabeçalho `Location` devolvido pelo backend.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct MapeamentoLocalizacao {
    pub prefixo_interno: &'static str,
    pub prefixo_externo: &'static str,
}

/// Ação a executar quando uma requisição casa com uma rota conhecida.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum AcaoRota {
    SondaVivaGateway,
    SondaProntidaoGateway,
    Encaminhar {
        modulo: Modulo,
        caminho_destino: String,
        mapeamento_localizacao: Option<MapeamentoLocalizacao>,
    },
    #[cfg(feature = "swagger")]
    RedirecionarSwaggerUi,
    #[cfg(feature = "swagger")]
    ServirArquivoSwagger {
        arquivo: String,
    },
    #[cfg(feature = "swagger")]
    ServirOpenApi {
        modulo: Modulo,
        visibilidade: Visibilidade,
    },
}

/// Resultado da classificação de método e caminho HTTP.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DecisaoRoteamento {
    Atender(AcaoRota),
    MetodoNaoPermitido { permitidos: &'static [&'static str] },
    NaoEncontrada,
}

#[derive(Clone, Copy)]
enum PadraoSegmento {
    Literal(&'static str),
    Parametro,
}

#[derive(Clone, Copy)]
enum DestinoRota {
    SondaVivaGateway,
    SondaProntidaoGateway,
    SondaModulo {
        modulo: Modulo,
        caminho_interno: &'static str,
    },
    ReescreverPrefixo {
        modulo: Modulo,
        visibilidade: Visibilidade,
    },
}

struct DefinicaoRota {
    segmentos: &'static [PadraoSegmento],
    metodos: &'static [&'static str],
    destino: DestinoRota,
}

const METODOS_LEITURA: &[&str] = &["GET", "HEAD"];
const METODOS_COLECAO: &[&str] = &["GET", "HEAD", "POST"];
const METODOS_RECURSO: &[&str] = &["GET", "HEAD", "PATCH", "DELETE"];

const TABELA_ROTAS: &[DefinicaoRota] = &[
    // Sondas na raiz do gateway
    DefinicaoRota {
        segmentos: &[PadraoSegmento::Literal("health")],
        metodos: METODOS_LEITURA,
        destino: DestinoRota::SondaVivaGateway,
    },
    DefinicaoRota {
        segmentos: &[PadraoSegmento::Literal("ready")],
        metodos: METODOS_LEITURA,
        destino: DestinoRota::SondaProntidaoGateway,
    },
    // Rotas públicas: backend_atividades_formativas (/public/formativas/...)
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("public"),
            PadraoSegmento::Literal("formativas"),
            PadraoSegmento::Literal("health"),
        ],
        metodos: METODOS_LEITURA,
        destino: DestinoRota::SondaModulo {
            modulo: Modulo::Formativas,
            caminho_interno: "/health",
        },
    },
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("public"),
            PadraoSegmento::Literal("formativas"),
            PadraoSegmento::Literal("ready"),
        ],
        metodos: METODOS_LEITURA,
        destino: DestinoRota::SondaModulo {
            modulo: Modulo::Formativas,
            caminho_interno: "/ready",
        },
    },
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("public"),
            PadraoSegmento::Literal("formativas"),
            PadraoSegmento::Literal("atividades"),
        ],
        metodos: METODOS_LEITURA,
        destino: DestinoRota::ReescreverPrefixo {
            modulo: Modulo::Formativas,
            visibilidade: Visibilidade::Public,
        },
    },
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("public"),
            PadraoSegmento::Literal("formativas"),
            PadraoSegmento::Literal("atividades"),
            PadraoSegmento::Parametro,
        ],
        metodos: METODOS_LEITURA,
        destino: DestinoRota::ReescreverPrefixo {
            modulo: Modulo::Formativas,
            visibilidade: Visibilidade::Public,
        },
    },
    // Rotas privadas: backend_atividades_formativas (/private/formativas/...)
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("private"),
            PadraoSegmento::Literal("formativas"),
            PadraoSegmento::Literal("agenda"),
        ],
        metodos: METODOS_LEITURA,
        destino: DestinoRota::ReescreverPrefixo {
            modulo: Modulo::Formativas,
            visibilidade: Visibilidade::Private,
        },
    },
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("private"),
            PadraoSegmento::Literal("formativas"),
            PadraoSegmento::Literal("atividades"),
        ],
        metodos: METODOS_COLECAO,
        destino: DestinoRota::ReescreverPrefixo {
            modulo: Modulo::Formativas,
            visibilidade: Visibilidade::Private,
        },
    },
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("private"),
            PadraoSegmento::Literal("formativas"),
            PadraoSegmento::Literal("atividades"),
            PadraoSegmento::Parametro,
        ],
        metodos: METODOS_RECURSO,
        destino: DestinoRota::ReescreverPrefixo {
            modulo: Modulo::Formativas,
            visibilidade: Visibilidade::Private,
        },
    },
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("private"),
            PadraoSegmento::Literal("formativas"),
            PadraoSegmento::Literal("atividades"),
            PadraoSegmento::Parametro,
            PadraoSegmento::Literal("periodos"),
        ],
        metodos: METODOS_COLECAO,
        destino: DestinoRota::ReescreverPrefixo {
            modulo: Modulo::Formativas,
            visibilidade: Visibilidade::Private,
        },
    },
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("private"),
            PadraoSegmento::Literal("formativas"),
            PadraoSegmento::Literal("atividades"),
            PadraoSegmento::Parametro,
            PadraoSegmento::Literal("periodos"),
            PadraoSegmento::Parametro,
        ],
        metodos: METODOS_RECURSO,
        destino: DestinoRota::ReescreverPrefixo {
            modulo: Modulo::Formativas,
            visibilidade: Visibilidade::Private,
        },
    },
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("private"),
            PadraoSegmento::Literal("formativas"),
            PadraoSegmento::Literal("tipos-atividade"),
        ],
        metodos: METODOS_COLECAO,
        destino: DestinoRota::ReescreverPrefixo {
            modulo: Modulo::Formativas,
            visibilidade: Visibilidade::Private,
        },
    },
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("private"),
            PadraoSegmento::Literal("formativas"),
            PadraoSegmento::Literal("tipos-atividade"),
            PadraoSegmento::Parametro,
        ],
        metodos: METODOS_RECURSO,
        destino: DestinoRota::ReescreverPrefixo {
            modulo: Modulo::Formativas,
            visibilidade: Visibilidade::Private,
        },
    },
    // Rotas públicas: backend_atividades_informativas (/public/informativas/...)
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("public"),
            PadraoSegmento::Literal("informativas"),
            PadraoSegmento::Literal("health"),
        ],
        metodos: METODOS_LEITURA,
        destino: DestinoRota::SondaModulo {
            modulo: Modulo::Informativas,
            caminho_interno: "/health",
        },
    },
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("public"),
            PadraoSegmento::Literal("informativas"),
            PadraoSegmento::Literal("ready"),
        ],
        metodos: METODOS_LEITURA,
        destino: DestinoRota::SondaModulo {
            modulo: Modulo::Informativas,
            caminho_interno: "/ready",
        },
    },
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("public"),
            PadraoSegmento::Literal("informativas"),
            PadraoSegmento::Literal("atividades"),
        ],
        metodos: METODOS_LEITURA,
        destino: DestinoRota::ReescreverPrefixo {
            modulo: Modulo::Informativas,
            visibilidade: Visibilidade::Public,
        },
    },
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("public"),
            PadraoSegmento::Literal("informativas"),
            PadraoSegmento::Literal("atividades"),
            PadraoSegmento::Parametro,
        ],
        metodos: METODOS_LEITURA,
        destino: DestinoRota::ReescreverPrefixo {
            modulo: Modulo::Informativas,
            visibilidade: Visibilidade::Public,
        },
    },
    // Rotas privadas: backend_atividades_informativas (/private/informativas/...)
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("private"),
            PadraoSegmento::Literal("informativas"),
            PadraoSegmento::Literal("agenda"),
        ],
        metodos: METODOS_LEITURA,
        destino: DestinoRota::ReescreverPrefixo {
            modulo: Modulo::Informativas,
            visibilidade: Visibilidade::Private,
        },
    },
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("private"),
            PadraoSegmento::Literal("informativas"),
            PadraoSegmento::Literal("atividades"),
        ],
        metodos: METODOS_COLECAO,
        destino: DestinoRota::ReescreverPrefixo {
            modulo: Modulo::Informativas,
            visibilidade: Visibilidade::Private,
        },
    },
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("private"),
            PadraoSegmento::Literal("informativas"),
            PadraoSegmento::Literal("atividades"),
            PadraoSegmento::Parametro,
        ],
        metodos: METODOS_RECURSO,
        destino: DestinoRota::ReescreverPrefixo {
            modulo: Modulo::Informativas,
            visibilidade: Visibilidade::Private,
        },
    },
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("private"),
            PadraoSegmento::Literal("informativas"),
            PadraoSegmento::Literal("atividades"),
            PadraoSegmento::Parametro,
            PadraoSegmento::Literal("periodos"),
        ],
        metodos: METODOS_COLECAO,
        destino: DestinoRota::ReescreverPrefixo {
            modulo: Modulo::Informativas,
            visibilidade: Visibilidade::Private,
        },
    },
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("private"),
            PadraoSegmento::Literal("informativas"),
            PadraoSegmento::Literal("atividades"),
            PadraoSegmento::Parametro,
            PadraoSegmento::Literal("periodos"),
            PadraoSegmento::Parametro,
        ],
        metodos: METODOS_RECURSO,
        destino: DestinoRota::ReescreverPrefixo {
            modulo: Modulo::Informativas,
            visibilidade: Visibilidade::Private,
        },
    },
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("private"),
            PadraoSegmento::Literal("informativas"),
            PadraoSegmento::Literal("modalidades"),
        ],
        metodos: METODOS_COLECAO,
        destino: DestinoRota::ReescreverPrefixo {
            modulo: Modulo::Informativas,
            visibilidade: Visibilidade::Private,
        },
    },
    DefinicaoRota {
        segmentos: &[
            PadraoSegmento::Literal("private"),
            PadraoSegmento::Literal("informativas"),
            PadraoSegmento::Literal("modalidades"),
            PadraoSegmento::Parametro,
        ],
        metodos: METODOS_RECURSO,
        destino: DestinoRota::ReescreverPrefixo {
            modulo: Modulo::Informativas,
            visibilidade: Visibilidade::Private,
        },
    },
];

/// Classifica a requisição HTTP segundo as rotas registradas dos módulos e do gateway.
pub fn classificar_requisicao(metodo: &str, caminho: &str) -> DecisaoRoteamento {
    #[cfg(feature = "swagger")]
    if let Some(decisao_swagger) = classificar_rotas_swagger(metodo, caminho) {
        return decisao_swagger;
    }

    let Some(sem_barra_inicial) = caminho.strip_prefix('/') else {
        return DecisaoRoteamento::NaoEncontrada;
    };
    if sem_barra_inicial.is_empty() {
        return DecisaoRoteamento::NaoEncontrada;
    }

    let segmentos: Vec<&str> = sem_barra_inicial.split('/').collect();
    for definicao in TABELA_ROTAS {
        if !casa_segmentos(&segmentos, definicao.segmentos) {
            continue;
        }
        if !definicao.metodos.contains(&metodo) {
            return DecisaoRoteamento::MetodoNaoPermitido {
                permitidos: definicao.metodos,
            };
        }
        return DecisaoRoteamento::Atender(construir_acao(definicao.destino, caminho));
    }

    DecisaoRoteamento::NaoEncontrada
}

#[cfg(feature = "swagger")]
fn classificar_rotas_swagger(metodo: &str, caminho: &str) -> Option<DecisaoRoteamento> {
    if caminho == "/swagger-ui" {
        return Some(validar_leitura(metodo, AcaoRota::RedirecionarSwaggerUi));
    }
    if let Some(arquivo) = caminho.strip_prefix("/swagger-ui/") {
        return Some(validar_leitura(
            metodo,
            AcaoRota::ServirArquivoSwagger {
                arquivo: arquivo.to_owned(),
            },
        ));
    }

    let especificacoes = [
        (
            "/public/formativas/openapi.json",
            Modulo::Formativas,
            Visibilidade::Public,
        ),
        (
            "/private/formativas/openapi.json",
            Modulo::Formativas,
            Visibilidade::Private,
        ),
        (
            "/public/informativas/openapi.json",
            Modulo::Informativas,
            Visibilidade::Public,
        ),
        (
            "/private/informativas/openapi.json",
            Modulo::Informativas,
            Visibilidade::Private,
        ),
    ];

    for (rota_openapi, modulo, visibilidade) in especificacoes {
        if caminho == rota_openapi {
            return Some(validar_leitura(
                metodo,
                AcaoRota::ServirOpenApi {
                    modulo,
                    visibilidade,
                },
            ));
        }
    }

    None
}

#[cfg(feature = "swagger")]
fn validar_leitura(metodo: &str, acao: AcaoRota) -> DecisaoRoteamento {
    if METODOS_LEITURA.contains(&metodo) {
        DecisaoRoteamento::Atender(acao)
    } else {
        DecisaoRoteamento::MetodoNaoPermitido {
            permitidos: METODOS_LEITURA,
        }
    }
}

fn casa_segmentos(recebidos: &[&str], padrao: &[PadraoSegmento]) -> bool {
    if recebidos.len() != padrao.len() {
        return false;
    }

    recebidos
        .iter()
        .zip(padrao.iter())
        .all(|(segmento, esperado)| match esperado {
            PadraoSegmento::Literal(literal) => *segmento == *literal,
            PadraoSegmento::Parametro => !segmento.is_empty(),
        })
}

fn construir_acao(destino: DestinoRota, caminho_original: &str) -> AcaoRota {
    match destino {
        DestinoRota::SondaVivaGateway => AcaoRota::SondaVivaGateway,
        DestinoRota::SondaProntidaoGateway => AcaoRota::SondaProntidaoGateway,
        DestinoRota::SondaModulo {
            modulo,
            caminho_interno,
        } => AcaoRota::Encaminhar {
            modulo,
            caminho_destino: caminho_interno.to_owned(),
            mapeamento_localizacao: None,
        },
        DestinoRota::ReescreverPrefixo {
            modulo,
            visibilidade,
        } => {
            let prefixo_externo = prefixo_externo(modulo, visibilidade);
            let prefixo_interno = prefixo_interno(modulo, visibilidade);
            let sufixo = caminho_original
                .strip_prefix(prefixo_externo)
                .unwrap_or(caminho_original);
            AcaoRota::Encaminhar {
                modulo,
                caminho_destino: format!("{prefixo_interno}{sufixo}"),
                mapeamento_localizacao: Some(MapeamentoLocalizacao {
                    prefixo_interno,
                    prefixo_externo,
                }),
            }
        }
    }
}

fn prefixo_externo(modulo: Modulo, visibilidade: Visibilidade) -> &'static str {
    match (modulo, visibilidade) {
        (Modulo::Formativas, Visibilidade::Public) => "/public/formativas",
        (Modulo::Formativas, Visibilidade::Private) => "/private/formativas",
        (Modulo::Informativas, Visibilidade::Public) => "/public/informativas",
        (Modulo::Informativas, Visibilidade::Private) => "/private/informativas",
    }
}

fn prefixo_interno(modulo: Modulo, visibilidade: Visibilidade) -> &'static str {
    match (modulo, visibilidade) {
        (Modulo::Formativas, Visibilidade::Public) => "/api/v1/formativas",
        (Modulo::Formativas, Visibilidade::Private) => "/api/v1/formativas/interno",
        (Modulo::Informativas, Visibilidade::Public) => "/api/v1/informativas",
        (Modulo::Informativas, Visibilidade::Private) => "/api/v1/informativas/interno",
    }
}
