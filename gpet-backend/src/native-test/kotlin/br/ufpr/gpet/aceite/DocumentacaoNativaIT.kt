package br.ufpr.gpet.aceite

import io.quarkus.test.common.QuarkusTestResource
import io.quarkus.test.junit.QuarkusIntegrationTest
import io.restassured.RestAssured.given
import org.junit.jupiter.api.Test

@QuarkusIntegrationTest
@QuarkusTestResource(PostgresRecurso::class)
class DocumentacaoNativaIT {
    @Test
    fun `documentacao nao e exposta no binario de producao`() {
        given().get("/q/openapi").then().statusCode(404)
        given().get("/q/swagger-ui").then().statusCode(404)
    }
}
