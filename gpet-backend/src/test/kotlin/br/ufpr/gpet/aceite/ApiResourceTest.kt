package br.ufpr.gpet.aceite

import io.quarkus.test.junit.QuarkusTest
import io.quarkus.test.common.QuarkusTestResource

@QuarkusTest
@QuarkusTestResource(PostgresRecurso::class)
class ApiResourceTest : ContratoHttp()
