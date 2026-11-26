"""Teste de integração do API Gateway contra instâncias descartáveis dos backends."""
import argparse
import json
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from uuid import UUID, uuid4


def conferir_specs(http, swagger):
    esperado_por_rota = {
        "/public/formativas/openapi.json": {
            "/public/formativas/health": {"get"},
            "/public/formativas/ready": {"get"},
            "/public/formativas/atividades": {"get"},
            "/public/formativas/atividades/{id}": {"get"},
        },
        "/private/formativas/openapi.json": {
            "/private/formativas/agenda": {"get"},
            "/private/formativas/atividades": {"get", "post"},
            "/private/formativas/atividades/{id}": {"get", "patch", "delete"},
            "/private/formativas/atividades/{id}/periodos": {"get", "post"},
            "/private/formativas/atividades/{id}/periodos/{periodoId}": {"get", "patch", "delete"},
            "/private/formativas/tipos-atividade": {"get", "post"},
            "/private/formativas/tipos-atividade/{id}": {"get", "patch", "delete"},
        },
        "/public/informativas/openapi.json": {
            "/public/informativas/health": {"get"},
            "/public/informativas/ready": {"get"},
            "/public/informativas/atividades": {"get"},
            "/public/informativas/atividades/{id}": {"get"},
        },
        "/private/informativas/openapi.json": {
            "/private/informativas/agenda": {"get"},
            "/private/informativas/atividades": {"get", "post"},
            "/private/informativas/atividades/{id}": {"get", "patch", "delete"},
            "/private/informativas/atividades/{id}/periodos": {"get", "post"},
            "/private/informativas/atividades/{id}/periodos/{periodoId}": {"get", "patch", "delete"},
            "/private/informativas/modalidades": {"get", "post"},
            "/private/informativas/modalidades/{id}": {"get", "patch", "delete"},
        },
    }

    for rota, caminhos_esperados in esperado_por_rota.items():
        if not swagger:
            http(rota, status=404)
            continue
        spec = http(rota)
        assert spec["openapi"].startswith("3.1"), rota
        assert {k: set(v) for k, v in spec["paths"].items()} == caminhos_esperados, rota


def testar(base, swagger):
    def http(caminho, metodo="GET", dados=None, status=200):
        body = json.dumps(dados).encode() if dados is not None else None
        req = Request(
            base + caminho,
            method=metodo,
            data=body,
            headers={"Content-Type": "application/json"},
        )
        try:
            resposta = urlopen(req, timeout=10)
        except HTTPError as erro:
            resposta = erro
        with resposta:
            texto = resposta.read()
            assert resposta.status == status, (metodo, caminho, resposta.status, texto)
            if texto and "application/json" in resposta.headers.get("Content-Type", ""):
                valor = json.loads(texto)
                if status == 201:
                    assert resposta.headers["Location"] == caminho + "/" + valor["id"]
                return valor
            return texto

    http("/health")
    http("/ready")
    http("/public/formativas/health")
    http("/public/formativas/ready")
    http("/public/informativas/health")
    http("/public/informativas/ready")
    http("/api/v1/formativas/atividades", status=404)
    http("/swagger-ui/", status=200 if swagger else 404)
    if swagger:
        js = http("/swagger-ui/swagger-initializer.js").decode()
        for url in [
            "/public/formativas/openapi.json",
            "/private/formativas/openapi.json",
            "/public/informativas/openapi.json",
            "/private/informativas/openapi.json",
        ]:
            assert url in js
    conferir_specs(http, swagger)

    for servico, classificacao in [
        ("formativas", "tipos-atividade"),
        ("informativas", "modalidades"),
    ]:
        pub = f"/public/{servico}"
        priv = f"/private/{servico}"
        exemplo = "019aa000-0001-7000-8000-000000000001"
        assert len(http(f"{pub}/atividades?limite=5")["itens"]) > 0
        assert http(f"{pub}/atividades/{exemplo}")["conteudo"]

        tipo_id = http(f"{priv}/{classificacao}", "POST", {"nome": str(uuid4())}, 201)["id"]
        assert UUID(tipo_id).version == 7
        atividade_id = http(
            f"{priv}/atividades",
            "POST",
            {
                "classificacao_id": tipo_id,
                "titulo": "Teste gateway",
                "descricao": "Resumo",
                "publico_alvo": "Grupo",
                "meio": "ONLINE",
            },
            201,
        )["id"]
        http(f"{pub}/atividades/{atividade_id}", status=404)
        http(
            f"{priv}/atividades/{atividade_id}",
            "PATCH",
            {"conteudo": "Conteúdo", "publicacao_publica": True, "agenda_pesquisa": True},
            204,
        )
        assert http(f"{pub}/atividades/{atividade_id}")["titulo"] == "Teste gateway"

        periodo_id = http(
            f"{priv}/atividades/{atividade_id}/periodos",
            "POST",
            {"inicio": "2026-12-08T10:00:00Z", "termino": "2026-12-08T12:00:00Z", "fuso": "UTC"},
            201,
        )["id"]
        janela = urlencode(dict(inicio="2026-12-08T00:00:00Z", termino="2026-12-09T00:00:00Z"))
        assert any(
            item["periodo_id"] == periodo_id
            for item in http(f"{priv}/agenda?{janela}")["itens"]
        )
        http(f"{priv}/atividades/{atividade_id}/periodos/{periodo_id}", "DELETE", status=204)
        http(f"{priv}/atividades/{atividade_id}", "DELETE", status=204)
        http(f"{priv}/{classificacao}/{tipo_id}", "DELETE", status=204)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("--swagger", action="store_true")
    args = parser.parse_args()
    testar(args.url, args.swagger)
