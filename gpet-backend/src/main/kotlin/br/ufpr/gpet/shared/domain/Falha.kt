package br.ufpr.gpet.shared.domain

sealed class Falha(override val message: String, cause: Throwable? = null) : RuntimeException(message, cause)

class Validacao(message: String) : Falha(message)
class NaoEncontrado : Falha("Registro não encontrado.")
class Conflito : Falha("O registro foi alterado por outra pessoa. Recarregue antes de salvar.")
class Duplicado(message: String) : Falha(message)
class LoginDuplicado : Falha("Login já cadastrado.")
class Referenciado : Falha("O registro possui referências ou uma associação inválida.")
class CredenciaisInvalidas : Falha("Credenciais inválidas.")
class NaoAutenticado(message: String) : Falha(message)
class CsrfInvalido : Falha("Token CSRF inválido. Recarregue a página.")
class TrocaObrigatoria : Falha("Troque a senha temporária antes de continuar.")
class LimiteLoginExcedido : Falha("Muitas tentativas. Aguarde quinze minutos.")
class ErroInterno(cause: Throwable? = null) : Falha("Não foi possível concluir a operação.", cause)

fun exigir(condicao: Boolean, mensagem: String) {
    if (!condicao) throw Validacao(mensagem)
}

fun ausente(): Nothing = throw NaoEncontrado()
fun conflito(): Nothing = throw Conflito()
