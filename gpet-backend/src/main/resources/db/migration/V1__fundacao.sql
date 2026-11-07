CREATE TABLE usuarios (
    id UUID PRIMARY KEY,
    nome VARCHAR(200) NOT NULL CHECK (length(btrim(nome)) > 0),
    login VARCHAR(100) NOT NULL CHECK (login ~ '^[a-z0-9._-]{3,100}$'),
    senha_hash TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    trocar_senha BOOLEAN NOT NULL DEFAULT TRUE,
    versao BIGINT NOT NULL DEFAULT 0 CHECK (versao >= 0),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX usuarios_login_unico ON usuarios (lower(btrim(login)));
CREATE TABLE sessoes (
    token_hash CHAR(64) PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    csrf_token VARCHAR(100) NOT NULL,
    expira_em TIMESTAMPTZ NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessoes_usuario ON sessoes(usuario_id);
CREATE INDEX sessoes_expiracao ON sessoes(expira_em);
CREATE TABLE categorias_atividade (
    id UUID PRIMARY KEY,
    natureza VARCHAR(20) NOT NULL CHECK (natureza IN ('informativa', 'formativa')),
    nome VARCHAR(200) NOT NULL CHECK (length(btrim(nome)) > 0),
    descricao TEXT NOT NULL CHECK (length(btrim(descricao)) BETWEEN 1 AND 10000),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    versao BIGINT NOT NULL DEFAULT 0 CHECK (versao >= 0),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    criado_por UUID REFERENCES usuarios(id),
    atualizado_por UUID REFERENCES usuarios(id),
    UNIQUE(id, natureza)
);
CREATE UNIQUE INDEX categorias_nome_unico ON categorias_atividade(natureza, lower(btrim(nome)));
CREATE TABLE formatos_atividade (
    id UUID PRIMARY KEY,
    nome VARCHAR(200) NOT NULL CHECK (length(btrim(nome)) > 0),
    descricao TEXT NOT NULL CHECK (length(btrim(descricao)) BETWEEN 1 AND 10000),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    versao BIGINT NOT NULL DEFAULT 0 CHECK (versao >= 0),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    criado_por UUID REFERENCES usuarios(id),
    atualizado_por UUID REFERENCES usuarios(id)
);
CREATE UNIQUE INDEX formatos_nome_unico ON formatos_atividade(lower(btrim(nome)));
CREATE TABLE atividades (
    id UUID PRIMARY KEY,
    natureza VARCHAR(20) NOT NULL CHECK (natureza IN ('informativa', 'formativa')),
    categoria_id UUID NOT NULL,
    formato_id UUID NOT NULL REFERENCES formatos_atividade(id),
    titulo VARCHAR(300) NOT NULL CHECK (length(btrim(titulo)) > 0),
    objetivo TEXT,
    descricao TEXT,
    carga_horaria VARCHAR(500) NOT NULL CHECK (length(btrim(carga_horaria)) > 0),
    inicio DATE NOT NULL,
    fim DATE NOT NULL CHECK (fim >= inicio),
    publico_alvo VARCHAR(1000) NOT NULL CHECK (length(btrim(publico_alvo)) > 0),
    versao BIGINT NOT NULL DEFAULT 0 CHECK (versao >= 0),
    excluida BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    criado_por UUID NOT NULL REFERENCES usuarios(id),
    atualizado_por UUID NOT NULL REFERENCES usuarios(id),
    FOREIGN KEY(categoria_id, natureza) REFERENCES categorias_atividade(id, natureza),
    CHECK ((natureza = 'informativa' AND length(btrim(objetivo)) BETWEEN 1 AND 10000 AND objetivo IS NOT NULL AND descricao IS NULL)
        OR (natureza = 'formativa' AND length(btrim(descricao)) BETWEEN 1 AND 10000 AND descricao IS NOT NULL AND objetivo IS NULL))
);
CREATE INDEX atividades_publicas ON atividades(natureza, inicio DESC, id) WHERE NOT excluida;
CREATE INDEX atividades_categoria ON atividades(categoria_id);
CREATE INDEX atividades_formato ON atividades(formato_id);

-- Serializar associações e desativações impede inserir atividade em catálogo já desativado.
CREATE FUNCTION validar_catalogos_atividade() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' OR NEW.categoria_id IS DISTINCT FROM OLD.categoria_id THEN
        PERFORM 1 FROM categorias_atividade WHERE id = NEW.categoria_id AND ativo FOR SHARE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Categoria desativada ou inexistente' USING ERRCODE = '23514'; END IF;
    END IF;
    IF TG_OP = 'INSERT' OR NEW.formato_id IS DISTINCT FROM OLD.formato_id THEN
        PERFORM 1 FROM formatos_atividade WHERE id = NEW.formato_id AND ativo FOR SHARE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Formato desativado ou inexistente' USING ERRCODE = '23514'; END IF;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER atividade_catalogos BEFORE INSERT OR UPDATE ON atividades FOR EACH ROW EXECUTE FUNCTION validar_catalogos_atividade();
