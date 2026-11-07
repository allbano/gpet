ALTER TABLE usuarios ADD COLUMN criado_por UUID REFERENCES usuarios(id);
ALTER TABLE usuarios ADD COLUMN atualizado_por UUID REFERENCES usuarios(id);
-- Contas anteriores à migration são associadas à própria identidade.
UPDATE usuarios SET criado_por = id, atualizado_por = id;
