package br.ufpr.gpet.aceite

import io.quarkus.test.junit.QuarkusIntegrationTest
import io.quarkus.test.common.QuarkusTestResource

@QuarkusIntegrationTest
@QuarkusTestResource(PostgresRecurso::class)
class ApiResourceIT : ContratoHttp()
