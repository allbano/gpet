package br.ufpr.gpet.identidade.infrastructure

import br.ufpr.gpet.identidade.domain.Senhas
import br.ufpr.gpet.identidade.domain.validarSenha
import jakarta.enterprise.context.ApplicationScoped
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

@ApplicationScoped

class SenhasAdaptativas : Senhas {
    private fun derivar(senha: String, salt: ByteArray, iteracoes: Int): ByteArray {
        val spec = PBEKeySpec(senha.toCharArray(), salt, iteracoes, 256)
        return try {
            SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
        } finally {
            spec.clearPassword()
        }
    }

    override fun hash(senha: String): String {
        validarSenha(senha)
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val encoder = Base64.getEncoder()
        return listOf(
            "pbkdf2-sha256",
            "600000",
            encoder.encodeToString(salt),
            encoder.encodeToString(derivar(senha, salt, 600000))
        ).joinToString("$")
    }

    override fun confere(senha: String, hash: String): Boolean {
        if (senha.length !in 1..1024) return false
        return try {
            val partes = hash.split('$')
            if (partes.size != 4 || partes[0] != "pbkdf2-sha256" || partes[1].toInt() !in 600000..2000000) false
            else MessageDigest.isEqual(
                Base64.getDecoder().decode(partes[3]),
                derivar(senha, Base64.getDecoder().decode(partes[2]), partes[1].toInt())
            )
        } catch (_: IllegalArgumentException) {
            false
        }
    }
}
