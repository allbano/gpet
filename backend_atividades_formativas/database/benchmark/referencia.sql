-- Executar em uma base descartável logo após as migrações, antes do mock.
BEGIN;
INSERT INTO gpet.tipo_atividade (tipo_atividade) VALUES ('Oficina') RETURNING uuidv7 AS tipo \gset
INSERT INTO gpet.atividades_formativas (uuidv7_tipo_atividade, meio, titulo, descricao, conteudo,
    publico_alvo, publicacao_publica, agenda_pesquisa, created_at)
SELECT :'tipo', 'PRESENCIAL', 'Oficina ' || i, 'Práticas de pesquisa', 'Material para discussão',
       'Pesquisadores', i % 3 <> 0, i % 4 <> 0, timestamptz '2026-01-01 00:00Z' + i * interval '1 second'
FROM generate_series(1, 100000) AS serie(i);

-- Duas sessões por atividade selecionada, distribuídas pelo ano.
INSERT INTO gpet.periodos_formativos (uuidv7_atividade, periodo, fuso)
SELECT uuidv7, tstzrange(inicio, inicio + interval '2 hours', '[)'), 'UTC'
FROM gpet.atividades_formativas
CROSS JOIN generate_series(0,1) AS sessao(n)
CROSS JOIN LATERAL (SELECT split_part(titulo, ' ', 2)::int AS i) AS oficina
CROSS JOIN LATERAL (SELECT timestamptz '2026-01-01 09:00Z'
    + (i % 365) * interval '1 day' + n * interval '4 hours' AS inicio) AS horario
WHERE i % 50 = 1;
COMMIT;
ANALYZE gpet.atividades_formativas;
ANALYZE gpet.periodos_formativos;
ANALYZE gpet.tipo_atividade;
