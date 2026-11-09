package br.ufpr.gpet.shared.presentation

import jakarta.ws.rs.core.Application
import org.eclipse.microprofile.openapi.annotations.OpenAPIDefinition
import org.eclipse.microprofile.openapi.annotations.info.Info
import org.eclipse.microprofile.openapi.annotations.security.SecurityScheme
import org.eclipse.microprofile.openapi.annotations.security.SecuritySchemes
import org.eclipse.microprofile.openapi.annotations.enums.SecuritySchemeIn
import org.eclipse.microprofile.openapi.annotations.enums.SecuritySchemeType
import org.eclipse.microprofile.openapi.annotations.servers.Server
import org.eclipse.microprofile.openapi.annotations.tags.Tag

@OpenAPIDefinition(
    info = Info(
        title = "GPET API",
        version = "1.0.0",
        description = "API pública e administrativa do GPET. Sessões usam cookie HttpOnly e escritas autenticadas exigem CSRF."
    ),
    servers = [Server(url = "/", description = "Mesma origem usada para acessar a especificação.")],
    tags = [
        Tag(name = "Autenticação", description = "Login, sessão, logout e troca da própria senha."),
        Tag(name = "Usuários", description = "Administração de contas e credenciais."),
        Tag(name = "Atividades administrativas", description = "Gestão autenticada de atividades."),
        Tag(name = "Atividades públicas", description = "Consulta pública de atividades."),
        Tag(name = "Catálogos administrativos", description = "Gestão autenticada de categorias e formatos."),
        Tag(name = "Catálogos públicos", description = "Consulta pública de categorias e formatos ativos.")
    ]
)
@SecuritySchemes(
    SecurityScheme(
        securitySchemeName = "GPET_SESSION",
        type = SecuritySchemeType.APIKEY,
        apiKeyName = "GPET_SESSION",
        `in` = SecuritySchemeIn.COOKIE,
        description = "Cookie HttpOnly de sessão obtido no login."
    ),
    SecurityScheme(
        securitySchemeName = "X-CSRF-Token",
        type = SecuritySchemeType.APIKEY,
        apiKeyName = "X-CSRF-Token",
        `in` = SecuritySchemeIn.HEADER,
        description = "Token CSRF da sessão, obrigatório em conjunto com o cookie nas escritas autenticadas."
    )
)
class ApiDocumentacao : Application()
