package br.ufpr.gpet.shared.domain

class Falha(val status: Int, val codigo: String, override val message: String) :
    RuntimeException(message)

fun exigir(condicao: Boolean, mensagem: String) {
    if (!condicao) throw Falha(400, "validacao", mensagem)
}

fun ausente(): Nothing = throw Falha(404, "nao_encontrado", "Registro não encontrado.")
fun conflito(): Nothing = throw Falha(
    409,
    "conflito",
    "O registro foi alterado por outra pessoa. Recarregue antes de salvar."
)
