ALTER TABLE gpet.tipo_atividade
    ADD CONSTRAINT pk_classificacao PRIMARY KEY (uuidv7),
    ADD CONSTRAINT nome_unico UNIQUE (tipo_atividade),
    ADD CONSTRAINT nome_preenchido CHECK (btrim(tipo_atividade) <> '');

ALTER TABLE gpet.atividades_formativas
    ADD CONSTRAINT pk_atividade PRIMARY KEY (uuidv7),
    ADD CONSTRAINT fk_classificacao FOREIGN KEY (uuidv7_tipo_atividade) REFERENCES gpet.tipo_atividade ON DELETE RESTRICT,
    ADD CONSTRAINT titulo_preenchido CHECK (btrim(titulo) <> ''),
    ADD CONSTRAINT descricao_preenchida CHECK (btrim(descricao) <> ''),
    ADD CONSTRAINT publico_preenchido CHECK (btrim(publico_alvo) <> ''),
    ADD CONSTRAINT conteudo_publicado CHECK (NOT publicacao_publica OR conteudo ~ '[^[:space:]]'),
    ADD CONSTRAINT carga_nao_negativa CHECK (carga_horaria_minutos >= 0);

ALTER TABLE gpet.periodos_formativos
    ADD CONSTRAINT pk_periodo PRIMARY KEY (uuidv7),
    ADD CONSTRAINT fk_atividade FOREIGN KEY (uuidv7_atividade) REFERENCES gpet.atividades_formativas ON DELETE CASCADE;

CREATE TRIGGER trg_formativas_updated_at
BEFORE UPDATE ON gpet.atividades_formativas
FOR EACH ROW
EXECUTE FUNCTION gpet.atualizar_updated_at();

CREATE TRIGGER trg_periodos_formativos_updated_at
BEFORE UPDATE ON gpet.periodos_formativos
FOR EACH ROW
EXECUTE FUNCTION gpet.atualizar_updated_at();

CREATE TRIGGER trg_periodos_formativos_validar_fuso
BEFORE INSERT OR UPDATE OF fuso ON gpet.periodos_formativos
FOR EACH ROW
EXECUTE FUNCTION gpet.validar_fuso();

CREATE INDEX idx_formativas_tipo_atividade
    ON gpet.atividades_formativas (uuidv7_tipo_atividade);

CREATE INDEX idx_periodos_formativos_atividade
    ON gpet.periodos_formativos (uuidv7_atividade, lower(periodo), uuidv7);

CREATE INDEX idx_periodos_formativos_periodo
    ON gpet.periodos_formativos USING gist (periodo);

CREATE INDEX idx_cartoes_publicos ON gpet.atividades_formativas (created_at DESC, uuidv7 DESC)
WHERE publicacao_publica;
CREATE INDEX idx_cadastros ON gpet.atividades_formativas (created_at DESC, uuidv7 DESC);

-- Projeções atualizáveis usadas pelo repositório dos serviços.
CREATE VIEW gpet.classificacao AS
SELECT uuidv7 AS id, tipo_atividade AS nome FROM gpet.tipo_atividade;

CREATE VIEW gpet.atividade AS
SELECT uuidv7 AS id, uuidv7_tipo_atividade AS classificacao_id, titulo AS titulo, descricao AS descricao,
       meio, conteudo, publico_alvo, carga_horaria_minutos, publicacao_publica, agenda_pesquisa,
       created_at, updated_at
FROM gpet.atividades_formativas;

CREATE VIEW gpet.sessao AS
SELECT uuidv7 AS id, uuidv7_atividade AS atividade_id, periodo, fuso FROM gpet.periodos_formativos;

CREATE VIEW gpet.vw_agenda AS
SELECT
    a.uuidv7 AS uuidv7_atividade,
    p.uuidv7 AS uuidv7_periodo,
    'FORMATIVA'::text AS natureza,
    a.titulo,
    a.descricao,
    a.meio::text AS meio,
    a.publico_alvo,
    p.periodo::tstzrange AS periodo,
    lower(p.periodo) AS inicio,
    upper(p.periodo) AS termino,
    p.fuso
FROM gpet.atividades_formativas AS a
INNER JOIN gpet.periodos_formativos AS p
    ON p.uuidv7_atividade = a.uuidv7
WHERE a.agenda_pesquisa = true;

CREATE VIEW gpet.vw_lista_publica AS
SELECT
    a.uuidv7,
    a.titulo,
    a.descricao,
    a.meio,
    a.publico_alvo,
    a.carga_horaria_minutos,
    min(lower(p.periodo)) AS inicio,
    max(upper(p.periodo)) AS termino,
    range_agg(p.periodo::tstzrange) AS periodos,
    count(p.uuidv7) AS quantidade_periodos
FROM gpet.atividades_formativas AS a
LEFT JOIN gpet.periodos_formativos AS p
    ON p.uuidv7_atividade = a.uuidv7
WHERE a.publicacao_publica = true
GROUP BY a.uuidv7;
