-- Carga opcional para desenvolvimento. IDs reservados permitem reexecução.
INSERT INTO gpet.modalidades (uuidv7, modalidade)
SELECT ('019aa000-0000-7000-8000-' || lpad(i::text, 12, '0'))::uuid, nome
FROM unnest(ARRAY['Cartilha', 'Boletim', 'Divulgação', 'Encontro']) WITH ORDINALITY AS tipos(nome, i)
ON CONFLICT (uuidv7) DO NOTHING;

INSERT INTO gpet.atividades_informativas (uuidv7, uuidv7_modalidade, meio, titulo_acao, objetivo_acao, conteudo,
    publico_alvo, carga_horaria_minutos, publicacao_publica, agenda_pesquisa)
SELECT ('019aa000-0001-7000-8000-' || lpad(i::text, 12, '0'))::uuid,
       ('019aa000-0000-7000-8000-' || lpad((1+(i-1)%4)::text, 12, '0'))::uuid,
       (ARRAY['IMPRESSO','ONLINE','PRESENCIAL','HIBRIDO'])[1+(i-1)%4]::gpet.meio_transmissao,
       CASE WHEN i = 1 THEN 'Cartilha de divulgação científica'
            ELSE (ARRAY['Cartilha', 'Boletim', 'Divulgação', 'Encontro'])[1+(i-1)%4] || ' de ' ||
                 (ARRAY['educação','pesquisa','extensão'])[1+i%3] || ' — edição ' || i END,
       'Introdução aos métodos e práticas do grupo.',
       'Leitura orientada, discussão de casos e atividades de pesquisa.',
       (ARRAY['Graduação','Comunidade externa','Pesquisadores'])[1+i%3],
       CASE WHEN i = 1 THEN NULL WHEN i%5 <> 0 THEN i*15 END, i%3 <> 0, i%4 <> 0
FROM generate_series(1,120) AS serie(i)
ON CONFLICT (uuidv7) DO NOTHING;

INSERT INTO gpet.periodos_informativos (uuidv7, uuidv7_atividade, periodo, fuso)
SELECT ('019aa000-0002-7000-8000-' || lpad(i::text,12,'0'))::uuid,
       ('019aa000-0001-7000-8000-' || lpad(i::text,12,'0'))::uuid,
       tstzrange(inicio, inicio + interval '2 hours', '[)'), 'America/Sao_Paulo'
FROM generate_series(2,120) AS serie(i)
CROSS JOIN LATERAL (SELECT timestamptz '2027-01-01 23:00-03' + i * interval '1 day' AS inicio) AS horario
WHERE i%5 <> 0
ON CONFLICT (uuidv7) DO NOTHING;
