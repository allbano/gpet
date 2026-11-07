plugins {
    kotlin("jvm") version "2.4.10"
    kotlin("plugin.allopen") version "2.4.10"
    id("io.quarkus")
}

repositories {
    mavenCentral()
    mavenLocal()
}

val quarkusPlatformGroupId = providers.gradleProperty("quarkusPlatformGroupId").get()
val quarkusPlatformArtifactId = providers.gradleProperty("quarkusPlatformArtifactId").get()
val quarkusPlatformVersion = providers.gradleProperty("quarkusPlatformVersion").get()

dependencies {
    implementation("io.quarkiverse.jooq:quarkus-jooq:2.2.0")
    implementation(enforcedPlatform("${quarkusPlatformGroupId}:${quarkusPlatformArtifactId}:${quarkusPlatformVersion}"))
    implementation("io.quarkus:quarkus-rest-jackson")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("io.quarkus:quarkus-flyway")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("io.quarkus:quarkus-narayana-jta")
    implementation("io.quarkus:quarkus-smallrye-openapi")
    implementation("io.quarkus:quarkus-smallrye-health")
    implementation("io.quarkus:quarkus-logging-json")
    implementation("io.quarkus:quarkus-kotlin")
    implementation("io.quarkus:quarkus-jdbc-postgresql")
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")
    implementation("io.quarkus:quarkus-arc")
    implementation("io.quarkus:quarkus-rest")
    testImplementation("io.quarkus:quarkus-junit")
    testImplementation("io.rest-assured:rest-assured")
    testImplementation("org.testcontainers:testcontainers-postgresql:2.0.5")
}

group = "br.ufpr.gpet"
version = "1.0.0-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_25
    targetCompatibility = JavaVersion.VERSION_25
}

allOpen {
    annotation("jakarta.ws.rs.Path")
    annotation("jakarta.enterprise.context.ApplicationScoped")
    annotation("jakarta.persistence.Entity")
    annotation("io.quarkus.test.junit.QuarkusTest")
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_25
        javaParameters = true
    }
}

// A geração usa banco descartável; nunca consulta o banco de produção.
val codegen = sourceSets.create("codegen")
val codegenImplementation = configurations.getByName("codegenImplementation")
val codegenRuntimeOnly = configurations.getByName("codegenRuntimeOnly")
dependencies {
    codegenImplementation("org.jooq:jooq-codegen:3.20.3")
    codegenImplementation("org.flywaydb:flyway-core:12.0.0")
    codegenRuntimeOnly("org.flywaydb:flyway-database-postgresql:12.0.0")
    codegenRuntimeOnly("org.postgresql:postgresql:42.7.13")
    codegenRuntimeOnly("org.slf4j:slf4j-simple:1.7.36")
    codegenImplementation("org.testcontainers:testcontainers-postgresql:2.0.5")
}
val generatedJooq = layout.buildDirectory.dir("generated-src/jooq")
val codegenPostgresPort = providers.gradleProperty("gpetCodegenPort")
val generateJooq = tasks.register<JavaExec>("generateJooq") {
    group = "build"
    description = "Aplica migrations em PostgreSQL 18 temporário e gera tipos jOOQ. Requer Docker."
    dependsOn(tasks.named("codegenClasses"))
    classpath = codegen.runtimeClasspath
    mainClass = "br.ufpr.gpet.codegen.GerarJooq"
    args(file("src/main/resources/db/migration").absolutePath, generatedJooq.get().asFile.absolutePath)
    codegenPostgresPort.orNull?.let { args(it) }
    inputs.property("postgresCodegenPort", codegenPostgresPort.orElse("testcontainers"))
    inputs.dir("src/main/resources/db/migration")
    outputs.dir(generatedJooq)
}
sourceSets.main { java.srcDir(generatedJooq) }
tasks.named("compileKotlin") { dependsOn(generateJooq) }
tasks.named("compileJava") { dependsOn(generateJooq) }
