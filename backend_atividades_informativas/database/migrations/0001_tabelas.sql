CREATE TABLE gpet.modalidades (
    uuidv7       uuid DEFAULT uuidv7(),
    modalidade   text NOT NULL
);

CREATE TABLE gpet.atividades_informativas (
    uuidv7                uuid DEFAULT uuidv7(),
    uuidv7_modalidade     uuid NOT NULL,
    meio                  gpet.meio_transmissao NOT NULL,
    titulo_acao           text NOT NULL,
    objetivo_acao         text NOT NULL,
    conteudo              text NOT NULL DEFAULT '',
    carga_horaria_minutos integer,
    publico_alvo          text NOT NULL,
    publicacao_publica    boolean NOT NULL DEFAULT false,
    agenda_pesquisa       boolean NOT NULL DEFAULT false,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE gpet.periodos_informativos (
    uuidv7           uuid DEFAULT uuidv7(),
    uuidv7_atividade uuid NOT NULL,
    periodo          gpet.intervalo_atividade NOT NULL,
    fuso             text NOT NULL DEFAULT 'America/Sao_Paulo',
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);
