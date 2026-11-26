ALTER TABLE gpet.modalidades
    ADD CONSTRAINT pk_classificacao PRIMARY KEY (uuidv7),
    ADD CONSTRAINT nome_unico UNIQUE (modalidade),
    ADD CONSTRAINT nome_preenchido CHECK (btrim(modalidade) <> '');

ALTER TABLE gpet.atividades_informativas
    ADD CONSTRAINT pk_atividade PRIMARY KEY (uuidv7),
    ADD CONSTRAINT fk_classificacao FOREIGN KEY (uuidv7_modalidade) REFERENCES gpet.modalidades ON DELETE RESTRICT,
    ADD CONSTRAINT titulo_preenchido CHECK (btrim(titulo_acao) <> ''),
    ADD CONSTRAINT descricao_preenchida CHECK (btrim(objetivo_acao) <> ''),
    ADD CONSTRAINT publico_preenchido CHECK (btrim(publico_alvo) <> ''),
    ADD CONSTRAINT conteudo_publicado CHECK (NOT publicacao_publica OR conteudo ~ '[^[:space:]]'),
    ADD CONSTRAINT carga_nao_negativa CHECK (carga_horaria_minutos >= 0);

ALTER TABLE gpet.periodos_informativos
    ADD CONSTRAINT pk_periodo PRIMARY KEY (uuidv7),
    ADD CONSTRAINT fk_atividade FOREIGN KEY (uuidv7_atividade) REFERENCES gpet.atividades_informativas ON DELETE CASCADE;

CREATE TRIGGER trg_informativas_updated_at
BEFORE UPDATE ON gpet.atividades_informativas
FOR EACH ROW
EXECUTE FUNCTION gpet.atualizar_updated_at();

CREATE TRIGGER trg_periodos_informativos_updated_at
BEFORE UPDATE ON gpet.periodos_informativos
FOR EACH ROW
EXECUTE FUNCTION gpet.atualizar_updated_at();

CREATE TRIGGER trg_periodos_informativos_validar_fuso
BEFORE INSERT OR UPDATE OF fuso ON gpet.periodos_informativos
FOR EACH ROW
EXECUTE FUNCTION gpet.validar_fuso();

CREATE INDEX idx_informativas_modalidade
    ON gpet.atividades_informativas (uuidv7_modalidade);

CREATE INDEX idx_periodos_informativos_atividade
    ON gpet.periodos_informativos (uuidv7_atividade, lower(periodo), uuidv7);

CREATE INDEX idx_periodos_informativos_periodo
    ON gpet.periodos_informativos USING gist (periodo);

CREATE INDEX idx_cartoes_publicos ON gpet.atividades_informativas (created_at DESC, uuidv7 DESC)
WHERE publicacao_publica;
CREATE INDEX idx_cadastros ON gpet.atividades_informativas (created_at DESC, uuidv7 DESC);

-- Projeções atualizáveis usadas pelo repositório dos serviços.
CREATE VIEW gpet.classificacao AS
SELECT uuidv7 AS id, modalidade AS nome FROM gpet.modalidades;

CREATE VIEW gpet.atividade AS
SELECT uuidv7 AS id, uuidv7_modalidade AS classificacao_id, titulo_acao AS titulo, objetivo_acao AS descricao,
       meio, conteudo, publico_alvo, carga_horaria_minutos, publicacao_publica, agenda_pesquisa,
       created_at, updated_at
FROM gpet.atividades_informativas;

CREATE VIEW gpet.sessao AS
SELECT uuidv7 AS id, uuidv7_atividade AS atividade_id, periodo, fuso FROM gpet.periodos_informativos;

CREATE VIEW gpet.vw_agenda AS
SELECT
    a.uuidv7 AS uuidv7_atividade,
    p.uuidv7 AS uuidv7_periodo,
    'INFORMATIVA'::text AS natureza,
    a.titulo_acao AS titulo,
    a.objetivo_acao AS descricao,
    a.meio::text AS meio,
    a.publico_alvo,
    p.periodo::tstzrange AS periodo,
    lower(p.periodo) AS inicio,
    upper(p.periodo) AS termino,
    p.fuso
FROM gpet.atividades_informativas AS a
INNER JOIN gpet.periodos_informativos AS p
    ON p.uuidv7_atividade = a.uuidv7
WHERE a.agenda_pesquisa = true;

CREATE VIEW gpet.vw_lista_publica AS
SELECT
    a.uuidv7,
    a.titulo_acao AS titulo,
    a.objetivo_acao AS descricao,
    a.meio,
    a.publico_alvo,
    a.carga_horaria_minutos,
    min(lower(p.periodo)) AS inicio,
    max(upper(p.periodo)) AS termino,
    range_agg(p.periodo::tstzrange) AS periodos,
    count(p.uuidv7) AS quantidade_periodos
FROM gpet.atividades_informativas AS a
LEFT JOIN gpet.periodos_informativos AS p
    ON p.uuidv7_atividade = a.uuidv7
WHERE a.publicacao_publica = true
GROUP BY a.uuidv7;
