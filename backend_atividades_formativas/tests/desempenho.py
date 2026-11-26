"""Mede a API release sobre database/benchmark/referencia.sql. PG* seleciona o banco."""
from concurrent.futures import ThreadPoolExecutor
from math import ceil
from statistics import median
from subprocess import check_output
from sys import argv
from time import perf_counter
from urllib.parse import urlencode
from urllib.request import urlopen


def escalar(sql):
    return check_output(["psql", "-XAt", "-c", sql], text=True).strip()


def medir(url):
    inicio = perf_counter()
    with urlopen(url, timeout=10) as resposta:
        tamanho = len(resposta.read())
    return 1000 * (perf_counter() - inicio), tamanho


def executar(base):
    cursor = escalar("""SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || id
        FROM gpet.atividade WHERE publicacao_publica ORDER BY created_at DESC, id DESC OFFSET 49999 LIMIT 1""")
    atividade = escalar("SELECT id FROM gpet.atividade WHERE titulo = 'Oficina 1'")
    assert cursor and atividade, "Carregue a base de referência"
    urls = {
        "Primeira página": "/atividades",
        "Após o cartão 50.000": "/atividades?" + urlencode({"cursor": cursor}),
        "Detalhe": "/atividades/" + atividade,
        "Agenda semanal": "/interno/agenda?" + urlencode({"inicio": "2026-12-07T00:00:00Z", "termino": "2026-12-14T00:00:00Z"}),
    }
    for nome, caminho in urls.items():
        url = base.rstrip("/") + "/api/v1/formativas" + caminho
        for _ in range(20):
            medir(url)
        with ThreadPoolExecutor(max_workers=8) as pool:
            medidas = list(pool.map(medir, [url] * 400))
        tempos = sorted(ms for ms, _ in medidas)
        print(f"{nome} | {tempos[ceil(.95 * len(tempos))-1]:.2f} ms | {median(b for _, b in medidas):.0f} B")


if __name__ == "__main__":
    executar(argv[1])
