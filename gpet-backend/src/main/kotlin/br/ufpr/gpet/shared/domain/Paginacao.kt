package br.ufpr.gpet.shared.domain

data class Paginacao(val pagina: Int = 0, val tamanho: Int = 20) {
    init {
        exigir(
            pagina in 0..1000000 && tamanho in 1..100,
            "Paginação inválida: página a partir de zero e tamanho entre 1 e 100."
        )
    }

    val offset get() = pagina * tamanho
}
