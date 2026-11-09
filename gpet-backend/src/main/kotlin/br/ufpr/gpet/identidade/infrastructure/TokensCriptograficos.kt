package br.ufpr.gpet.identidade.infrastructure

import br.ufpr.gpet.identidade.application.Tokens
import jakarta.enterprise.context.ApplicationScoped
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64

@ApplicationScoped
class TokensCriptograficos : Tokens {
    override fun aleatorio(): String = ByteArray(32).also { SecureRandom().nextBytes(it) }
        .let { Base64.getUrlEncoder().withoutPadding().encodeToString(it) }

    override fun hash(token: String): String =
        MessageDigest.getInstance("SHA-256").digest(token.toByteArray())
            .joinToString("") { "%02x".format(it) }
}
