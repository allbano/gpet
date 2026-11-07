-- Sementes editáveis. Autoria nula identifica dados de instalação, não usuários fictícios.
INSERT INTO formatos_atividade(id, nome, descricao) VALUES
('10000000-0000-0000-0000-000000000001', 'Presencial', 'Encontros presenciais.'),
('10000000-0000-0000-0000-000000000002', 'Remoto síncrono', 'Encontros remotos em tempo real.'),
('10000000-0000-0000-0000-000000000003', 'Remoto assíncrono', 'Participação remota sem horário simultâneo.'),
('10000000-0000-0000-0000-000000000004', 'Híbrido', 'Atividades presenciais e remotas.');
INSERT INTO categorias_atividade(id, natureza, nome, descricao) VALUES
('20000000-0000-0000-0000-000000000001', 'informativa', 'Palestra', 'Apresentação e compartilhamento de conhecimentos.'),
('20000000-0000-0000-0000-000000000002', 'informativa', 'Seminário', 'Discussão e divulgação de temas de estudo.'),
('20000000-0000-0000-0000-000000000003', 'formativa', 'Curso', 'Percurso de formação.'),
('20000000-0000-0000-0000-000000000004', 'formativa', 'Oficina', 'Formação por atividades práticas.');
