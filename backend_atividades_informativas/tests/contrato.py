"""Teste de integração contra uma instância descartável carregada com o mock."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from uuid import UUID, uuid4


def conferir_openapi(spec, prefixo, classe):
    caminhos = {
        "/atividades": {"get"}, "/atividades/{id}": {"get"},
        "/interno/agenda": {"get"}, "/interno/atividades": {"get", "post"},
        "/interno/atividades/{id}": {"get", "patch", "delete"},
        "/interno/atividades/{id}/periodos": {"get", "post"},
        "/interno/atividades/{id}/periodos/{periodoId}": {"get", "patch", "delete"},
        classe: {"get", "post"}, classe + "/{id}": {"get", "patch", "delete"},
    }
    esperado = {prefixo + caminho: metodos for caminho, metodos in caminhos.items()}
    esperado.update({"/health": {"get"}, "/ready": {"get"}})
    assert {k: set(v) for k, v in spec["paths"].items()} == esperado
    assert spec["openapi"].startswith("3.1")


def testar(base, spec, swagger):
    prefixo = "/api/v1/informativas"
    classe = "/interno/modalidades"
    conferir_openapi(spec, prefixo, classe)

    def http(caminho, metodo="GET", dados=None, status=200):
        body = json.dumps(dados).encode() if dados is not None else None
        req = Request(base + caminho, method=metodo, data=body,
                      headers={"Content-Type": "application/json"})
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

    def api(caminho, *args, **kwargs):
        return http(prefixo + caminho, *args, **kwargs)

    http("/health")
    http("/ready")
    http("/swagger-ui/", status=200 if swagger else 404)
    http("/swagger-ui/swagger-ui-bundle.js", status=200 if swagger else 404)
    if swagger:
        assert http("/openapi.json") == spec
    else:
        http("/openapi.json", status=404)
    consulta = "/atividades"
    interno = "/interno/atividades"
    exemplo = "019aa000-0001-7000-8000-000000000001"
    janela = "/interno/agenda?" + urlencode(dict(inicio="2026-12-07T00:00:00-03:00", termino="2026-12-14T00:00:00-03:00"))
    ids = []
    cursor = ""
    while True:
        pag = api(consulta + "?" + urlencode(dict(limite=7, **({"cursor": cursor} if cursor else {}))))
        ids.extend(item["id"] for item in pag["itens"])
        cursor = pag["proximo_cursor"]
        if not cursor:
            break
    assert ids.count(exemplo) == 1 and len(ids) == len(set(ids))
    assert api(consulta + "/" + exemplo)["conteudo"]
    sessoes = api(consulta + "/" + exemplo)["periodos"]
    assert len(sessoes) == 0
    assert [x["periodo_id"] for x in api(janela)["itens"] if x["atividade_id"] == exemplo] == [x["id"] for x in sessoes]
    if sessoes:
        primeira = api(janela + "&limite=2")
        segunda = api(janela + "&" + urlencode({"limite": 2, "cursor": primeira["proximo_cursor"]}))
        assert [p["periodo_id"] for p in primeira["itens"] + segunda["itens"]] == [p["id"] for p in sessoes[:4]]
    api(consulta + "?limite=101", status=400)
    api(consulta + "?cursor=invalido", status=400)
    api("/interno/agenda", status=400)

    tipo = api(classe, "POST", {"nome": str(uuid4())}, 201)["id"]
    assert UUID(tipo).version == 7
    assert api(classe + "/" + tipo)["id"] == tipo
    assert tipo in [c["id"] for c in api(classe)]
    api(classe + "/" + tipo, "PATCH", {"nome": str(uuid4())}, 204)
    dados = dict(classificacao_id=tipo, titulo="Teste", descricao="Resumo", publico_alvo="Grupo", meio="ONLINE")
    id_atividade = api(interno, "POST", dados, 201)["id"]
    assert UUID(id_atividade).version == 7
    atividade = interno + "/" + id_atividade
    api(classe + "/" + tipo, "DELETE", status=409)
    api(consulta + "/" + id_atividade, status=404)
    api(atividade, "PATCH", {"publicacao_publica": True}, 422)
    api(atividade, "PATCH", {"conteudo": "Material", "publicacao_publica": True}, 204)
    assert api(consulta + "/" + id_atividade)["periodos"] == []
    with ThreadPoolExecutor(2) as pool:
        list(pool.map(lambda d: api(atividade, "PATCH", d, 204),
                      [{"carga_horaria_minutos": 120}, {"titulo": "Edição concorrente"}]))
    atual = api(atividade)
    assert atual["titulo"] == "Edição concorrente" and atual["carga_horaria_minutos"] == 120
    api(atividade, "PATCH", {"carga_horaria_minutos": None}, 204)
    assert api(atividade)["carga_horaria_minutos"] is None
    periodos = atividade + "/periodos"
    horario = {"inicio": "2026-12-08T23:00:00Z", "termino": "2026-12-09T01:00:00Z", "fuso": "UTC"}
    sessao = api(periodos, "POST", horario, 201)["id"]
    segunda = dict(horario, inicio=horario["termino"], termino="2026-12-09T02:00:00Z")
    api(periodos, "POST", segunda, 201)
    assert len(api(periodos)) == 2
    assert all(x["atividade_id"] != id_atividade for x in api(janela)["itens"])
    api(atividade, "PATCH", {"publicacao_publica": False, "agenda_pesquisa": True}, 204)
    api(consulta + "/" + id_atividade, status=404)
    sobreposicao = "/interno/agenda?" + urlencode(dict(inicio="2026-12-09T00:00:00Z", termino=segunda["inicio"]))
    assert [x["periodo_id"] for x in api(sobreposicao)["itens"] if x["atividade_id"] == id_atividade] == [sessao]
    caminho = periodos + "/" + sessao
    assert UUID(sessao).version == 7
    antes = api(caminho)
    api(caminho, "PATCH", {"termino": horario["inicio"]}, 422)
    api(caminho, "PATCH", {"fuso": "Zona/Inexistente", "termino": "2026-12-10T00:00:00Z"}, 422)
    assert api(caminho) == antes
    with ThreadPoolExecutor(2) as pool:
        list(pool.map(lambda d: api(caminho, "PATCH", d, 204),
                      [{"fuso": "America/Manaus"}, {"inicio": "2026-12-08T22:00:00Z"}]))
    assert api(caminho)["fuso"] == "America/Manaus" and api(caminho)["inicio"] == "2026-12-08T22:00:00Z"
    api(interno + "/" + exemplo + "/periodos/" + sessao, "DELETE", status=404)
    api(caminho, "DELETE", status=204)
    api(caminho, status=404)
    api(atividade, "DELETE", status=204)
    api(atividade, status=404)
    api(classe + "/" + tipo, "DELETE", status=204)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("openapi", type=Path)
    parser.add_argument("--swagger", action="store_true")
    args = parser.parse_args()
    testar(args.url, json.loads(args.openapi.read_text()), args.swagger)
