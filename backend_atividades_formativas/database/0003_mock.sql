-- Carga opcional para desenvolvimento. IDs reservados permitem reexecução.
INSERT INTO gpet.tipo_atividade (uuidv7, tipo_atividade)
SELECT ('019aa000-0000-7000-8000-' || lpad(i::text, 12, '0'))::uuid, nome
FROM unnest(ARRAY['Minicurso', 'Oficina', 'Seminário', 'Laboratório']) WITH ORDINALITY AS tipos(nome, i)
ON CONFLICT (uuidv7) DO NOTHING;

INSERT INTO gpet.atividades_formativas (uuidv7, uuidv7_tipo_atividade, meio, titulo, descricao, conteudo,
    publico_alvo, carga_horaria_minutos, publicacao_publica, agenda_pesquisa)
SELECT ('019aa000-0001-7000-8000-' || lpad(i::text, 12, '0'))::uuid,
       ('019aa000-0000-7000-8000-' || lpad((1+(i-1)%4)::text, 12, '0'))::uuid,
       (ARRAY['HIBRIDO','ONLINE','PRESENCIAL','HIBRIDO'])[1+(i-1)%4]::gpet.meio_transmissao,
       CASE WHEN i = 1 THEN 'Minicurso de pesquisa em três dias'
            ELSE (ARRAY['Minicurso', 'Oficina', 'Seminário', 'Laboratório'])[1+(i-1)%4] || ' de ' ||
                 (ARRAY['educação','pesquisa','extensão'])[1+i%3] || ' — edição ' || i END,
       'Introdução aos métodos e práticas do grupo.',
       'Leitura orientada, discussão de casos e atividades de pesquisa.',
       (ARRAY['Graduação','Comunidade externa','Pesquisadores'])[1+i%3],
       CASE WHEN i = 1 THEN 1140 WHEN i%5 <> 0 THEN i*15 END, i%3 <> 0, i%4 <> 0
FROM generate_series(1,120) AS serie(i)
ON CONFLICT (uuidv7) DO NOTHING;

INSERT INTO gpet.periodos_formativos (uuidv7, uuidv7_atividade, periodo, fuso)
SELECT ('019aa000-0002-7000-8000-' || lpad(i::text,12,'0'))::uuid,
       ('019aa000-0001-7000-8000-' || lpad(i::text,12,'0'))::uuid,
       tstzrange(inicio, inicio + interval '2 hours', '[)'), 'America/Sao_Paulo'
FROM generate_series(2,120) AS serie(i)
CROSS JOIN LATERAL (SELECT timestamptz '2027-01-01 23:00-03' + i * interval '1 day' AS inicio) AS horario
WHERE i%5 <> 0
ON CONFLICT (uuidv7) DO NOTHING;

INSERT INTO gpet.periodos_formativos (uuidv7, uuidv7_atividade, periodo)
SELECT ('019aa000-0003-7000-8000-' || lpad(i::text,12,'0'))::uuid,
       '019aa000-0001-7000-8000-000000000001', tstzrange(inicio::timestamptz, termino::timestamptz, '[)')
FROM (VALUES
    (1, '2026-12-07 08:00-03', '2026-12-07 12:00-03'),
    (2, '2026-12-07 19:00-03', '2026-12-07 22:00-03'),
    (3, '2026-12-08 08:00-03', '2026-12-08 12:00-03'),
    (4, '2026-12-08 13:00-03', '2026-12-08 17:00-03'),
    (5, '2026-12-09 13:00-03', '2026-12-09 17:00-03')
) AS sessoes(i, inicio, termino)
ON CONFLICT (uuidv7) DO NOTHING;
