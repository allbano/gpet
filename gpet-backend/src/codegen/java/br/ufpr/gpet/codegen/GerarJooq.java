package br.ufpr.gpet.codegen;

import org.flywaydb.core.Flyway;
import org.jooq.codegen.GenerationTool;
import org.jooq.meta.jaxb.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

public final class GerarJooq {
    public static void main(String[] args) throws Exception {
        if (args.length != 2 && args.length != 3) {
            throw new IllegalArgumentException("Informe migrations, saída e, opcionalmente, a porta do PostgreSQL de build local.");
        }
        if (args.length == 3) {
            int porta = Integer.parseInt(args[2]);
            if (porta < 1 || porta > 65535) throw new IllegalArgumentException("Porta de build inválida.");
            // No Docker, o script cria um cluster novo e isolado no próprio builder.
            gerar(args, "jdbc:postgresql://127.0.0.1:" + porta + "/gpet_codegen", "postgres", "");
            return;
        }
        try (var postgres = new PostgreSQLContainer("postgres:18.6-alpine")) {
            postgres.start();
            gerar(args, postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
        }
    }

    private static void gerar(String[] args, String url, String usuario, String senha) throws Exception {
        Flyway.configure().dataSource(url, usuario, senha)
                .locations("filesystem:" + args[0]).load().migrate();
        GenerationTool.generate(new Configuration()
                .withJdbc(new Jdbc().withDriver("org.postgresql.Driver").withUrl(url)
                    .withUser(usuario).withPassword(senha))
                .withGenerator(new Generator()
                    .withDatabase(new Database().withName("org.jooq.meta.postgres.PostgresDatabase")
                        .withInputSchema("public").withExcludes("flyway_schema_history"))
                    .withTarget(new Target().withPackageName("br.ufpr.gpet.generated").withDirectory(args[1]))));
    }
}
