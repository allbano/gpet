-- Executar com psql na base de referência após referencia.sql.
SELECT created_at AS data, id AS cursor_id
FROM gpet.atividade WHERE publicacao_publica ORDER BY created_at DESC, id DESC
OFFSET 49999 LIMIT 1 \gset

SELECT id AS detalhe FROM gpet.atividade WHERE titulo = 'Oficina 1' \gset

PREPARE cartoes AS
SELECT a.id, a.titulo, a.descricao, a.meio::text, a.created_at, a.classificacao_id, c.nome
FROM gpet.atividade a JOIN gpet.classificacao c ON c.id = a.classificacao_id
WHERE a.publicacao_publica ORDER BY a.created_at DESC, a.id DESC LIMIT 21;

PREPARE pagina_profunda(timestamptz, uuid) AS
SELECT a.id, a.titulo, a.descricao, a.meio::text, a.created_at, a.classificacao_id, c.nome
FROM gpet.atividade a JOIN gpet.classificacao c ON c.id = a.classificacao_id
WHERE a.publicacao_publica AND (a.created_at, a.id) < ($1, $2)
ORDER BY a.created_at DESC, a.id DESC LIMIT 21;

PREPARE detalhe(uuid) AS
SELECT a.id, a.classificacao_id, a.meio::text, a.titulo, a.descricao, a.conteudo,
       a.publico_alvo, a.carga_horaria_minutos, a.publicacao_publica, a.agenda_pesquisa, c.nome,
       (SELECT coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'inicio', lower(periodo),
           'termino', upper(periodo), 'fuso', fuso) ORDER BY lower(periodo), s.id), '[]'::jsonb)
        FROM gpet.sessao s WHERE atividade_id = a.id)
FROM gpet.atividade a JOIN gpet.classificacao c ON c.id = a.classificacao_id
WHERE a.id = $1 AND a.publicacao_publica;

PREPARE agenda AS
SELECT uuidv7_atividade, uuidv7_periodo, titulo, descricao, natureza, meio, publico_alvo, inicio, termino, fuso
FROM gpet.vw_agenda WHERE periodo && tstzrange('2026-12-07 00:00Z', '2026-12-14 00:00Z', '[)')
ORDER BY inicio, uuidv7_periodo LIMIT 21;

EXPLAIN (ANALYZE, BUFFERS) EXECUTE cartoes;
EXPLAIN (ANALYZE, BUFFERS) EXECUTE pagina_profunda(:'data', :'cursor_id');
EXPLAIN (ANALYZE, BUFFERS) EXECUTE detalhe(:'detalhe');
EXPLAIN (ANALYZE, BUFFERS) EXECUTE agenda;
