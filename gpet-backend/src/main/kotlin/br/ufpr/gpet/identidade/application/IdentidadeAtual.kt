package br.ufpr.gpet.identidade.application

import br.ufpr.gpet.identidade.domain.Sessao
import br.ufpr.gpet.identidade.domain.Usuario
import jakarta.enterprise.context.RequestScoped

@RequestScoped
class IdentidadeAtual {
    lateinit var usuario: Usuario
    lateinit var sessao: Sessao
    lateinit var token: String
}
