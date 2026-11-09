package br.ufpr.gpet.identidade.application

interface Tokens {
    fun aleatorio(): String
    fun hash(token: String): String
}
