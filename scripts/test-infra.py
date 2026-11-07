"""Contratos de persistência e inicialização dos dois ambientes Compose."""
import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class PersistenciaComposeTest(unittest.TestCase):
    def test_ambientes_preservam_banco_e_inicializam_admin_sem_expor_secret_no_backend(self):
        for arquivo in ("compose.yaml", "compose.dev.yaml"):
            with self.subTest(arquivo=arquivo):
                config = json.loads(subprocess.check_output(
                    ["docker", "compose", "-f", arquivo, "--profile", "ops", "config", "--format", "json"],
                    cwd=ROOT, text=True,
                ))
                servicos = config["services"]
                banco = next(v for v in servicos["db"]["volumes"] if v["target"] == "/var/lib/postgresql")
                self.assertEqual("bind", banco["type"], "Dados precisam sobreviver à remoção de volumes Docker")
                self.assertTrue(Path(banco["source"]).is_absolute())
                self.assertEqual(["migrate-bootstrap"], servicos["migrate"]["command"])
                self.assertIn("GPET_ADMIN_PASSWORD_FILE", servicos["migrate"]["environment"])
                self.assertEqual("service_completed_successfully", servicos["backend"]["depends_on"]["migrate"]["condition"])
                self.assertNotIn("GPET_ADMIN_PASSWORD_FILE", servicos["backend"]["environment"])
                self.assertNotIn("admin_password", [s["source"] for s in servicos["backend"]["secrets"]])


if __name__ == "__main__":
    unittest.main()
