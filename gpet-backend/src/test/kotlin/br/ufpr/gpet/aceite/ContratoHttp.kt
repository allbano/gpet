package br.ufpr.gpet.aceite

import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import org.hamcrest.Matchers.*
import org.junit.jupiter.api.Test
import java.util.UUID

abstract class ContratoHttp {
    @Test fun `criacao e troca de senha respeitam os limites de oito e sessenta e quatro`() {
        val (cookie, csrf) = login()
        val nomeLogin = "limites-" + UUID.randomUUID().toString().take(8)
        fun criar(senha: String) = given().cookie("GPET_SESSION",cookie).header("X-CSRF-Token",csrf)
            .contentType(ContentType.JSON).body(mapOf("nome" to "Pessoa fictícia", "login" to nomeLogin, "senhaTemporaria" to senha))
            .post("/api/v1/admin/usuarios").then().log().ifValidationFails()
        for (tamanho in listOf(7, 65)) criar("a".repeat(tamanho)).statusCode(400)
        criar("12345678").statusCode(200)
        val entrada = given().header("X-GPET-Request","1").contentType(ContentType.JSON)
            .body(mapOf("login" to nomeLogin,"senha" to "12345678")).post("/api/v1/auth/login")
            .then().log().ifValidationFails().statusCode(200).extract()
        fun trocar(senha: String) = given().cookie("GPET_SESSION",entrada.cookie("GPET_SESSION"))
            .header("X-CSRF-Token",entrada.path<String>("csrfToken")).contentType(ContentType.JSON)
            .body(mapOf("senhaAtual" to "12345678", "novaSenha" to senha)).put("/api/v1/auth/senha")
            .then().log().ifValidationFails()
        for (tamanho in listOf(7, 65)) trocar("a".repeat(tamanho)).statusCode(400)
        trocar("b".repeat(64)).statusCode(204)
        given().header("X-GPET-Request","1").contentType(ContentType.JSON)
            .body(mapOf("login" to nomeLogin,"senha" to "b".repeat(64))).post("/api/v1/auth/login")
            .then().log().ifValidationFails().statusCode(200)
    }
    private fun login(): Pair<String,String> {
        val r = given().contentType(ContentType.JSON).header("X-GPET-Request","1").body(mapOf("login" to "aceite","senha" to "senha ficticia de aceite")).post("/api/v1/auth/login").then().log().ifValidationFails().statusCode(200).extract()
        return r.cookie("GPET_SESSION") to r.path("csrfToken")
    }
    @Test fun `limita tentativas incorretas sem revelar existencia do usuario`() {
        val login = "inexistente-" + UUID.randomUUID().toString().take(8)
        repeat(5) { given().header("X-GPET-Request","1").contentType(ContentType.JSON).body(mapOf("login" to login,"senha" to "senha ficticia incorreta")).post("/api/v1/auth/login").then().statusCode(401) }
        given().header("X-GPET-Request","1").contentType(ContentType.JSON).body(mapOf("login" to login,"senha" to "senha ficticia incorreta")).post("/api/v1/auth/login").then().statusCode(429)
    }
    @Test fun `visitante consulta catalogos mas nao altera cadastros`() {
        given().get("/api/v1/public/categorias").then().log().ifValidationFails().statusCode(200).body("total",greaterThanOrEqualTo(4))
        given().get("/api/v1/admin/usuarios").then().log().ifValidationFails().statusCode(401)
        given().contentType(ContentType.JSON).body(mapOf("nome" to "Invasão")).post("/api/v1/admin/formatos").then().log().ifValidationFails().statusCode(401)
        given().get("/api/v1/public/atividades?tamanho=101").then().log().ifValidationFails().statusCode(400)
    }
    @Test fun `login sessao csrf logout e hash nativo`() {
        val (cookie,csrf) = login()
        given().cookie("GPET_SESSION",cookie).get("/api/v1/auth/sessao").then().log().ifValidationFails().statusCode(200).body("usuario.login",equalTo("aceite")).body("usuario.senhaHash",nullValue())
        given().cookie("GPET_SESSION",cookie).contentType(ContentType.JSON).body("{}").post("/api/v1/auth/logout").then().log().ifValidationFails().statusCode(403)
        given().cookie("GPET_SESSION",cookie).header("X-CSRF-Token",csrf).contentType(ContentType.JSON).body("{}").post("/api/v1/auth/logout").then().log().ifValidationFails().statusCode(204)
        given().cookie("GPET_SESSION",cookie).get("/api/v1/auth/sessao").then().log().ifValidationFails().statusCode(401)
    }
    @Test fun `atividade publica imediatamente com conflito e catalogo desativado`() {
        val (cookie,csrf) = login()
        fun requisicao() = given().cookie("GPET_SESSION",cookie).header("X-CSRF-Token",csrf).contentType(ContentType.JSON)
        val categoria = requisicao().body(mapOf("nome" to "Categoria ${UUID.randomUUID()}","descricao" to "Dados fictícios","natureza" to "formativa")).post("/api/v1/admin/categorias").then().log().ifValidationFails().statusCode(200).extract().path<String>("id")
        val formato = requisicao().body(mapOf("nome" to "Formato ${UUID.randomUUID()}","descricao" to "Dados fictícios")).post("/api/v1/admin/formatos").then().log().ifValidationFails().statusCode(200).extract().path<String>("id")
        val dados = mutableMapOf<String,Any?>("natureza" to "formativa","categoriaId" to categoria,"formatoId" to formato,"titulo" to "Curso fictício","descricao" to "Formação de teste","objetivo" to null,"cargaHoraria" to "20 horas e estudo livre","inicio" to "2026-11-01","fim" to "2026-11-02","publicoAlvo" to "Docentes fictícios","versao" to 0)
        val id = requisicao().body(dados).post("/api/v1/admin/atividades").then().log().ifValidationFails().statusCode(200).extract().path<String>("id")
        given().get("/api/v1/public/atividades/$id").then().log().ifValidationFails().statusCode(200).body("cargaHoraria",equalTo("20 horas e estudo livre")).body("versao",nullValue()).body("criadoPor",nullValue())
        requisicao().delete("/api/v1/admin/categorias/$categoria?versao=0").then().log().ifValidationFails().statusCode(204)
        requisicao().delete("/api/v1/admin/formatos/$formato?versao=0").then().log().ifValidationFails().statusCode(204)
        dados["titulo"] = "Curso atualizado"
        requisicao().body(dados).put("/api/v1/admin/atividades/$id").then().log().ifValidationFails().statusCode(200).body("versao",equalTo(1))
        requisicao().body(dados).put("/api/v1/admin/atividades/$id").then().log().ifValidationFails().statusCode(409)
        requisicao().body(dados).post("/api/v1/admin/atividades").then().log().ifValidationFails().statusCode(400)
        given().get("/api/v1/public/atividades/$id").then().log().ifValidationFails().statusCode(200).body("categoriaNome",not(emptyString())).body("titulo",equalTo("Curso atualizado"))
        requisicao().delete("/api/v1/admin/atividades/$id?versao=1").then().log().ifValidationFails().statusCode(204)
        given().get("/api/v1/public/atividades/$id").then().log().ifValidationFails().statusCode(404)
    }
    @Test fun `qualquer usuario gerencia usuarios apos trocar senha temporaria`() {
        val (cookie,csrf) = login()
        val nomeLogin = "teste-" + UUID.randomUUID().toString().take(8)
        val conta = given().cookie("GPET_SESSION",cookie).header("X-CSRF-Token",csrf).contentType(ContentType.JSON).body(mapOf("nome" to "Pessoa fictícia","login" to nomeLogin,"senhaTemporaria" to "senha temporaria ficticia")).post("/api/v1/admin/usuarios").then().log().ifValidationFails().statusCode(200).extract().path<String>("id")
        val entrada = given().header("X-GPET-Request","1").contentType(ContentType.JSON).body(mapOf("login" to nomeLogin,"senha" to "senha temporaria ficticia")).post("/api/v1/auth/login").then().log().ifValidationFails().statusCode(200).extract()
        val token = entrada.cookie("GPET_SESSION"); val tokenCsrf = entrada.path<String>("csrfToken")
        given().cookie("GPET_SESSION",token).get("/api/v1/admin/usuarios").then().log().ifValidationFails().statusCode(403)
        given().cookie("GPET_SESSION",token).header("X-CSRF-Token",tokenCsrf).contentType(ContentType.JSON).body(mapOf("senhaAtual" to "senha temporaria ficticia","novaSenha" to "senha definitiva ficticia")).put("/api/v1/auth/senha").then().log().ifValidationFails().statusCode(204)
        given().cookie("GPET_SESSION",token).get("/api/v1/auth/sessao").then().log().ifValidationFails().statusCode(401)
        val nova = given().header("X-GPET-Request","1").contentType(ContentType.JSON).body(mapOf("login" to nomeLogin,"senha" to "senha definitiva ficticia")).post("/api/v1/auth/login").then().log().ifValidationFails().statusCode(200).extract()
        given().cookie("GPET_SESSION",nova.cookie("GPET_SESSION")).get("/api/v1/admin/usuarios").then().log().ifValidationFails().statusCode(200)
        given().cookie("GPET_SESSION",cookie).header("X-CSRF-Token",csrf).delete("/api/v1/admin/usuarios/$conta?versao=1").then().log().ifValidationFails().statusCode(200)
        given().cookie("GPET_SESSION",nova.cookie("GPET_SESSION")).get("/api/v1/auth/sessao").then().log().ifValidationFails().statusCode(401)
    }
}
