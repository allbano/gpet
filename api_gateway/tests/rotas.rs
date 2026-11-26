use api_gateway::configuracao::ConfiguracaoGateway;
#[cfg(feature = "swagger")]
use api_gateway::rotas::Visibilidade;
use api_gateway::rotas::{
    AcaoRota, DecisaoRoteamento, MapeamentoLocalizacao, Modulo, classificar_requisicao,
};

#[test]
fn porta_padrao_do_gateway_eh_55569() {
    let configuracao = ConfiguracaoGateway::padrao();
    assert_eq!(configuracao.endereco_escuta, "0.0.0.0:55569");
}

#[test]
fn sondas_do_gateway_e_dos_modulos_aceitam_get_e_head() {
    let casos = [
        ("/health", AcaoRota::SondaVivaGateway),
        ("/ready", AcaoRota::SondaProntidaoGateway),
        (
            "/public/formativas/health",
            AcaoRota::Encaminhar {
                modulo: Modulo::Formativas,
                caminho_destino: "/health".to_owned(),
                mapeamento_localizacao: None,
            },
        ),
        (
            "/public/formativas/ready",
            AcaoRota::Encaminhar {
                modulo: Modulo::Formativas,
                caminho_destino: "/ready".to_owned(),
                mapeamento_localizacao: None,
            },
        ),
        (
            "/public/informativas/health",
            AcaoRota::Encaminhar {
                modulo: Modulo::Informativas,
                caminho_destino: "/health".to_owned(),
                mapeamento_localizacao: None,
            },
        ),
        (
            "/public/informativas/ready",
            AcaoRota::Encaminhar {
                modulo: Modulo::Informativas,
                caminho_destino: "/ready".to_owned(),
                mapeamento_localizacao: None,
            },
        ),
    ];

    for (caminho, esperado) in casos {
        for metodo in ["GET", "HEAD"] {
            assert_eq!(
                classificar_requisicao(metodo, caminho),
                DecisaoRoteamento::Atender(esperado.clone()),
                "falha em {metodo} {caminho}"
            );
        }
        assert_eq!(
            classificar_requisicao("POST", caminho),
            DecisaoRoteamento::MetodoNaoPermitido {
                permitidos: &["GET", "HEAD"]
            }
        );
    }
}

#[test]
fn todas_as_rotas_public_e_private_reescrevem_prefixo_e_validam_metodos() {
    let map_fmt_pub = Some(MapeamentoLocalizacao {
        prefixo_interno: "/api/v1/formativas",
        prefixo_externo: "/public/formativas",
    });
    let map_fmt_priv = Some(MapeamentoLocalizacao {
        prefixo_interno: "/api/v1/formativas/interno",
        prefixo_externo: "/private/formativas",
    });
    let map_inf_pub = Some(MapeamentoLocalizacao {
        prefixo_interno: "/api/v1/informativas",
        prefixo_externo: "/public/informativas",
    });
    let map_inf_priv = Some(MapeamentoLocalizacao {
        prefixo_interno: "/api/v1/informativas/interno",
        prefixo_externo: "/private/informativas",
    });

    type LinhaMatriz = (
        &'static str,
        Modulo,
        &'static str,
        Option<MapeamentoLocalizacao>,
        &'static [&'static str],
        &'static [&'static str],
    );

    let matriz: &[LinhaMatriz] = &[
        // Formativas — Public
        (
            "/public/formativas/atividades",
            Modulo::Formativas,
            "/api/v1/formativas/atividades",
            map_fmt_pub,
            &["GET", "HEAD"],
            &["POST", "PATCH", "DELETE"],
        ),
        (
            "/public/formativas/atividades/019aa000-0001-7000-8000-000000000001",
            Modulo::Formativas,
            "/api/v1/formativas/atividades/019aa000-0001-7000-8000-000000000001",
            map_fmt_pub,
            &["GET", "HEAD"],
            &["POST", "PATCH", "DELETE"],
        ),
        // Formativas — Private
        (
            "/private/formativas/agenda",
            Modulo::Formativas,
            "/api/v1/formativas/interno/agenda",
            map_fmt_priv,
            &["GET", "HEAD"],
            &["POST", "PATCH", "DELETE"],
        ),
        (
            "/private/formativas/atividades",
            Modulo::Formativas,
            "/api/v1/formativas/interno/atividades",
            map_fmt_priv,
            &["GET", "HEAD", "POST"],
            &["PATCH", "DELETE"],
        ),
        (
            "/private/formativas/atividades/019aa000-0001-7000-8000-000000000001",
            Modulo::Formativas,
            "/api/v1/formativas/interno/atividades/019aa000-0001-7000-8000-000000000001",
            map_fmt_priv,
            &["GET", "HEAD", "PATCH", "DELETE"],
            &["POST"],
        ),
        (
            "/private/formativas/atividades/019aa000-0001-7000-8000-000000000001/periodos",
            Modulo::Formativas,
            "/api/v1/formativas/interno/atividades/019aa000-0001-7000-8000-000000000001/periodos",
            map_fmt_priv,
            &["GET", "HEAD", "POST"],
            &["PATCH", "DELETE"],
        ),
        (
            "/private/formativas/atividades/019aa000-0001-7000-8000-000000000001/periodos/019aa000-0002-7000-8000-000000000002",
            Modulo::Formativas,
            "/api/v1/formativas/interno/atividades/019aa000-0001-7000-8000-000000000001/periodos/019aa000-0002-7000-8000-000000000002",
            map_fmt_priv,
            &["GET", "HEAD", "PATCH", "DELETE"],
            &["POST"],
        ),
        (
            "/private/formativas/tipos-atividade",
            Modulo::Formativas,
            "/api/v1/formativas/interno/tipos-atividade",
            map_fmt_priv,
            &["GET", "HEAD", "POST"],
            &["PATCH", "DELETE"],
        ),
        (
            "/private/formativas/tipos-atividade/019aa000-0001-7000-8000-000000000001",
            Modulo::Formativas,
            "/api/v1/formativas/interno/tipos-atividade/019aa000-0001-7000-8000-000000000001",
            map_fmt_priv,
            &["GET", "HEAD", "PATCH", "DELETE"],
            &["POST"],
        ),
        // Informativas — Public
        (
            "/public/informativas/atividades",
            Modulo::Informativas,
            "/api/v1/informativas/atividades",
            map_inf_pub,
            &["GET", "HEAD"],
            &["POST", "PATCH", "DELETE"],
        ),
        (
            "/public/informativas/atividades/019aa000-0001-7000-8000-000000000001",
            Modulo::Informativas,
            "/api/v1/informativas/atividades/019aa000-0001-7000-8000-000000000001",
            map_inf_pub,
            &["GET", "HEAD"],
            &["POST", "PATCH", "DELETE"],
        ),
        // Informativas — Private
        (
            "/private/informativas/agenda",
            Modulo::Informativas,
            "/api/v1/informativas/interno/agenda",
            map_inf_priv,
            &["GET", "HEAD"],
            &["POST", "PATCH", "DELETE"],
        ),
        (
            "/private/informativas/atividades",
            Modulo::Informativas,
            "/api/v1/informativas/interno/atividades",
            map_inf_priv,
            &["GET", "HEAD", "POST"],
            &["PATCH", "DELETE"],
        ),
        (
            "/private/informativas/atividades/019aa000-0001-7000-8000-000000000001",
            Modulo::Informativas,
            "/api/v1/informativas/interno/atividades/019aa000-0001-7000-8000-000000000001",
            map_inf_priv,
            &["GET", "HEAD", "PATCH", "DELETE"],
            &["POST"],
        ),
        (
            "/private/informativas/atividades/019aa000-0001-7000-8000-000000000001/periodos",
            Modulo::Informativas,
            "/api/v1/informativas/interno/atividades/019aa000-0001-7000-8000-000000000001/periodos",
            map_inf_priv,
            &["GET", "HEAD", "POST"],
            &["PATCH", "DELETE"],
        ),
        (
            "/private/informativas/atividades/019aa000-0001-7000-8000-000000000001/periodos/019aa000-0002-7000-8000-000000000002",
            Modulo::Informativas,
            "/api/v1/informativas/interno/atividades/019aa000-0001-7000-8000-000000000001/periodos/019aa000-0002-7000-8000-000000000002",
            map_inf_priv,
            &["GET", "HEAD", "PATCH", "DELETE"],
            &["POST"],
        ),
        (
            "/private/informativas/modalidades",
            Modulo::Informativas,
            "/api/v1/informativas/interno/modalidades",
            map_inf_priv,
            &["GET", "HEAD", "POST"],
            &["PATCH", "DELETE"],
        ),
        (
            "/private/informativas/modalidades/019aa000-0001-7000-8000-000000000001",
            Modulo::Informativas,
            "/api/v1/informativas/interno/modalidades/019aa000-0001-7000-8000-000000000001",
            map_inf_priv,
            &["GET", "HEAD", "PATCH", "DELETE"],
            &["POST"],
        ),
    ];

    for (caminho, modulo, destino, mapeamento, permitidos, proibidos) in matriz {
        for metodo in *permitidos {
            assert_eq!(
                classificar_requisicao(metodo, caminho),
                DecisaoRoteamento::Atender(AcaoRota::Encaminhar {
                    modulo: *modulo,
                    caminho_destino: (*destino).to_owned(),
                    mapeamento_localizacao: *mapeamento,
                }),
                "falha em {metodo} {caminho}"
            );
        }

        for metodo in *proibidos {
            assert_eq!(
                classificar_requisicao(metodo, caminho),
                DecisaoRoteamento::MetodoNaoPermitido { permitidos },
                "falha de método proibido em {metodo} {caminho}"
            );
        }
    }

    // IDs inválidos continuam sendo encaminhados ao backend para validação
    assert_eq!(
        classificar_requisicao("GET", "/public/formativas/atividades/invalido"),
        DecisaoRoteamento::Atender(AcaoRota::Encaminhar {
            modulo: Modulo::Formativas,
            caminho_destino: "/api/v1/formativas/atividades/invalido".to_owned(),
            mapeamento_localizacao: map_fmt_pub,
        })
    );
}

#[cfg(feature = "swagger")]
#[test]
fn rotas_swagger_e_openapi_funcionam_quando_feature_habilitada() {
    assert_eq!(
        classificar_requisicao("GET", "/swagger-ui"),
        DecisaoRoteamento::Atender(AcaoRota::RedirecionarSwaggerUi)
    );
    assert_eq!(
        classificar_requisicao("GET", "/swagger-ui/"),
        DecisaoRoteamento::Atender(AcaoRota::ServirArquivoSwagger {
            arquivo: String::new(),
        })
    );
    assert_eq!(
        classificar_requisicao("GET", "/swagger-ui/swagger-initializer.js"),
        DecisaoRoteamento::Atender(AcaoRota::ServirArquivoSwagger {
            arquivo: "swagger-initializer.js".to_owned(),
        })
    );
    assert_eq!(
        classificar_requisicao("POST", "/swagger-ui/"),
        DecisaoRoteamento::MetodoNaoPermitido {
            permitidos: &["GET", "HEAD"]
        }
    );

    let specs = [
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

    for (caminho, modulo, visibilidade) in specs {
        assert_eq!(
            classificar_requisicao("GET", caminho),
            DecisaoRoteamento::Atender(AcaoRota::ServirOpenApi {
                modulo,
                visibilidade,
            })
        );
        assert_eq!(
            classificar_requisicao("POST", caminho),
            DecisaoRoteamento::MetodoNaoPermitido {
                permitidos: &["GET", "HEAD"]
            }
        );
    }
}

#[cfg(not(feature = "swagger"))]
#[test]
fn rotas_swagger_e_openapi_nao_existem_sem_feature_swagger() {
    for caminho in [
        "/swagger-ui",
        "/swagger-ui/",
        "/swagger-ui/swagger-initializer.js",
        "/public/formativas/openapi.json",
        "/private/formativas/openapi.json",
        "/public/informativas/openapi.json",
        "/private/informativas/openapi.json",
    ] {
        assert_eq!(
            classificar_requisicao("GET", caminho),
            DecisaoRoteamento::NaoEncontrada,
            "sem feature swagger deveria retornar 404: {caminho}"
        );
    }
}

#[test]
fn rotas_antigas_ou_inexistentes_retornam_nao_encontrada() {
    for caminho in [
        "/",
        "/api/v1/formativas/atividades",
        "/api/v1/informativas/atividades",
        "/api/v1/formativas/interno/atividades",
        "/public/formativas/atividades/",
        "/public/formativas/agenda",
        "/private/formativas/health",
        "/private/formativas/ready",
        "/private/formativas/modalidades",
        "/private/informativas/tipos-atividade",
        "/public/formativas/swagger-ui/",
        "/private/informativas/swagger-ui/",
    ] {
        assert_eq!(
            classificar_requisicao("GET", caminho),
            DecisaoRoteamento::NaoEncontrada,
            "caminho não deveria casar: {caminho}"
        );
    }
}
