# Desktop Kitchen POS - ProGuard Rules

# ---- Retrofit + OkHttp ----
-dontwarn okhttp3.**
-dontwarn okio.**
-keepattributes Signature
-keepattributes *Annotation*

# Keep Retrofit service interfaces
-keep,allowobfuscation interface com.desktopkitchen.pos.networking.api.** {
    @retrofit2.http.* <methods>;
}

# ---- Moshi ----
-keep class com.squareup.moshi.** { *; }
-keepclassmembers class * {
    @com.squareup.moshi.Json <fields>;
}
# Keep generated Moshi adapters
-keep class **JsonAdapter { *; }
-keepnames @com.squareup.moshi.JsonClass class *

# ---- Models (Moshi needs these) ----
-keep class com.desktopkitchen.pos.models.** { *; }

# ---- Hilt ----
-dontwarn dagger.hilt.**

# ---- Compose ----
-dontwarn androidx.compose.**

# ---- Kotlin Coroutines ----
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}

# ---- Kotlin Serialization (if used later) ----
-keepattributes RuntimeVisibleAnnotations,AnnotationDefault

# ---- General ----
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
