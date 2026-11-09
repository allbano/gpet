package br.ufpr.gpet.aceite

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import io.quarkus.test.common.QuarkusTestResource
import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@QuarkusTest
@QuarkusTestResource(PostgresRecurso::class, restrictToAnnotatedClass = true)
class OpenApiTest {
    private lateinit var spec: JsonNode

    @BeforeEach
    fun carregar() {
        val json = given().queryParam("format", "json").get("/q/openapi")
            .then().statusCode(200).extract().asString()
        spec = ObjectMapper().readTree(json)
    }

    private fun operacao(path: String, metodo: String) = spec.path("paths").path(path).path(metodo)
    private fun esquema(nome: String) = spec.path("components").path("schemas").path(nome)
    private fun resolver(schema: JsonNode): JsonNode {
        val ref = schema.path("\$ref").asText()
        return if (ref.isEmpty()) schema else esquema(ref.substringAfterLast('/'))
    }

    @Test fun `documenta todas as rotas e metodos atuais`() {
        val rotas = mapOf(
            "/api/v1/auth/login" to mapOf("post" to "200"),
            "/api/v1/auth/sessao" to mapOf("get" to "200"),
            "/api/v1/auth/logout" to mapOf("post" to "204"),
            "/api/v1/auth/senha" to mapOf("put" to "204"),
            "/api/v1/admin/usuarios" to mapOf("get" to "200", "post" to "200"),
            "/api/v1/admin/usuarios/{id}" to mapOf("get" to "200", "put" to "200", "delete" to "200"),
            "/api/v1/admin/usuarios/{id}/senha" to mapOf("put" to "200"),
            "/api/v1/admin/atividades" to mapOf("get" to "200", "post" to "200"),
            "/api/v1/admin/atividades/{id}" to mapOf("get" to "200", "put" to "200", "delete" to "204"),
            "/api/v1/public/atividades" to mapOf("get" to "200"),
            "/api/v1/public/atividades/{id}" to mapOf("get" to "200"),
            "/api/v1/admin/categorias" to mapOf("get" to "200", "post" to "200"),
            "/api/v1/admin/categorias/{id}" to mapOf("get" to "200", "put" to "200", "delete" to "204"),
            "/api/v1/admin/formatos" to mapOf("get" to "200", "post" to "200"),
            "/api/v1/admin/formatos/{id}" to mapOf("get" to "200", "put" to "200", "delete" to "204"),
            "/api/v1/public/categorias" to mapOf("get" to "200"),
            "/api/v1/public/formatos" to mapOf("get" to "200"),
        )
        rotas.forEach { (path, metodos) ->
            metodos.forEach { (metodo, sucesso) ->
                val operacao = operacao(path, metodo)
                assertTrue(operacao.isObject, "Ausente: $metodo $path")
                assertTrue(operacao.path("summary").asText().isNotBlank())
                assertTrue(operacao.path("tags").size() > 0)
                assertTrue(operacao.path("responses").has(sucesso), "Resposta $sucesso ausente: $metodo $path")
            }
        }
        assertEquals("GPET API", spec.path("info").path("title").asText())
        assertEquals("1.0.0", spec.path("info").path("version").asText())
        assertTrue(spec.path("info").path("description").asText().isNotBlank())
        assertTrue(spec.path("servers").size() > 0)
        assertEquals(6, spec.path("tags").size())
    }

    @Test fun `documenta seguranca csrf e cookies sem expor segredos`() {
        val esquemas = spec.path("components").path("securitySchemes")
        assertEquals("cookie", esquemas.path("GPET_SESSION").path("in").asText())
        assertEquals("GPET_SESSION", esquemas.path("GPET_SESSION").path("name").asText())
        assertEquals("header", esquemas.path("X-CSRF-Token").path("in").asText())
        assertEquals("X-CSRF-Token", esquemas.path("X-CSRF-Token").path("name").asText())

        val login = operacao("/api/v1/auth/login", "post")
        assertTrue(login.path("parameters").any { it.path("name").asText() == "X-GPET-Request" && it.path("required").asBoolean() })
        assertTrue(login.path("responses").path("200").path("headers").has("Set-Cookie"))
        assertTrue(login.path("security").isMissingNode || login.path("security").isEmpty)

        val leitura = operacao("/api/v1/admin/atividades", "get")
        assertTrue(leitura.path("security").any { it.has("GPET_SESSION") && !it.has("X-CSRF-Token") })
        assertTrue(leitura.path("responses").has("403"))
        val escrita = operacao("/api/v1/admin/atividades", "post")
        assertTrue(escrita.path("security").any { it.has("GPET_SESSION") && it.has("X-CSRF-Token") })
        assertTrue(operacao("/api/v1/public/atividades", "get").path("security").isEmpty)
        assertTrue(operacao("/api/v1/auth/logout", "post").path("responses").path("204").path("headers").has("Set-Cookie"))
        assertTrue(operacao("/api/v1/auth/senha", "put").path("responses").path("204").path("headers").has("Set-Cookie"))
        assertTrue(operacao("/api/v1/admin/atividades/{id}", "delete").path("responses").path("204").path("content").isMissingNode)

        val texto = spec.toString()
        assertFalse(texto.contains("senhaHash"))
        assertFalse(texto.contains("tokenHash"))
    }

    @Test fun `documenta limites parametros e politicas de senha`() {
        val parametros = operacao("/api/v1/public/atividades", "get").path("parameters")
        val pagina = parametros.first { it.path("name").asText() == "pagina" }
        val tamanho = parametros.first { it.path("name").asText() == "tamanho" }
        assertEquals(0, pagina.path("schema").path("default").asInt())
        assertEquals(0, pagina.path("schema").path("minimum").asInt())
        assertEquals(1000000, pagina.path("schema").path("maximum").asInt())
        assertEquals(20, tamanho.path("schema").path("default").asInt())
        assertEquals(1, tamanho.path("schema").path("minimum").asInt())
        assertEquals(100, tamanho.path("schema").path("maximum").asInt())

        assertEquals(1024, esquema("LoginEntrada").path("properties").path("senha").path("maxLength").asInt())
        assertTrue(esquema("LoginEntrada").path("properties").path("senha").path("minLength").isMissingNode)
        assertEquals(1024, esquema("TrocaSenhaEntrada").path("properties").path("senhaAtual").path("maxLength").asInt())
        assertEquals(8, esquema("TrocaSenhaEntrada").path("properties").path("novaSenha").path("minLength").asInt())
        assertEquals(64, esquema("TrocaSenhaEntrada").path("properties").path("novaSenha").path("maxLength").asInt())
        assertEquals(8, esquema("NovoUsuarioEntrada").path("properties").path("senhaTemporaria").path("minLength").asInt())
        assertEquals(64, esquema("NovoUsuarioEntrada").path("properties").path("senhaTemporaria").path("maxLength").asInt())
        assertEquals(300, esquema("AtividadeEntrada").path("properties").path("titulo").path("maxLength").asInt())
        assertEquals("uuid", resolver(esquema("AtividadeDto").path("properties").path("id")).path("format").asText())
        assertEquals("date", resolver(esquema("AtividadeDto").path("properties").path("inicio")).path("format").asText())
        assertEquals("date-time", resolver(esquema("SessaoDto").path("properties").path("expiraEm")).path("format").asText())
    }

    @Test fun `swagger ui esta disponivel no perfil de teste`() {
        given().get("/q/swagger-ui/").then().statusCode(200)
            .contentType(org.hamcrest.Matchers.containsString("text/html"))
            .body(org.hamcrest.Matchers.containsString("SwaggerUIBundle"))
    }

    @Test fun `paginas e erros possuem schemas concretos`() {
        val resposta = operacao("/api/v1/admin/atividades", "get").path("responses").path("200")
        val media = resposta.path("content").path("application/json")
        val pagina = resolver(media.path("schema"))
        for (campo in listOf("itens", "total", "pagina", "tamanho")) {
            assertTrue(pagina.path("properties").has(campo), "Paginação sem $campo: $pagina")
        }
        val erro = operacao("/api/v1/admin/atividades", "get").path("responses").path("400")
            .path("content").path("application/json").path("schema")
        assertEquals("ErroHttp", erro.path("\$ref").asText().substringAfterLast('/'))
        assertTrue(esquema("ErroHttp").path("properties").has("codigo"))
        assertTrue(esquema("ErroHttp").path("properties").has("mensagem"))
    }
}
