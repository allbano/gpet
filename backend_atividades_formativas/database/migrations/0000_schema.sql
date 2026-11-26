CREATE SCHEMA gpet;

CREATE TYPE gpet.meio_transmissao AS ENUM (
    'ONLINE',
    'PRESENCIAL',
    'HIBRIDO',
    'IMPRESSO'
);

CREATE DOMAIN gpet.intervalo_atividade AS tstzrange
CHECK (
    NOT isempty(VALUE)
    AND NOT lower_inf(VALUE)
    AND NOT upper_inf(VALUE)
    AND isfinite(lower(VALUE))
    AND isfinite(upper(VALUE))
    AND lower(VALUE) < upper(VALUE)
    AND lower_inc(VALUE)
    AND NOT upper_inc(VALUE)
);

CREATE FUNCTION gpet.atualizar_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := statement_timestamp();
    RETURN NEW;
END;
$$;

CREATE FUNCTION gpet.validar_fuso()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_timezone_names
        WHERE name = NEW.fuso
    ) THEN
        RAISE EXCEPTION
            'Fuso horário inválido: %', NEW.fuso
            USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
END;
$$;
