package br.ufpr.gpet.shared.domain

data class Pagina<T>(
    val itens: List<T>,
    val total: Long,
    val pagina: Int,
    val tamanho: Int,
)
