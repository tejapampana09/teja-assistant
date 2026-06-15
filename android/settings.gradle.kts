pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_PROJECT)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Teja Assistant"
include(":app")
include(":capacitor-android")
project(":capacitor-android").projectDir = file("../node_modules/@capacitor/android/capacitor")
include(":capacitor-cordova-android-plugins")
project(":capacitor-cordova-android-plugins").projectDir = file("capacitor-cordova-android-plugins")
