pluginManagement {
    val quarkusPluginVersion = providers.gradleProperty("quarkusPluginVersion")
    val quarkusPluginId = providers.gradleProperty("quarkusPluginId")
    repositories {
        mavenCentral()
        gradlePluginPortal()
        mavenLocal()
    }
    plugins {
        id(quarkusPluginId.get()) version quarkusPluginVersion.get()
    }
}
rootProject.name="gpet-backend"
