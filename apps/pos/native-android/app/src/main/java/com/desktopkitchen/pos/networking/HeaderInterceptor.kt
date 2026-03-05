package com.desktopkitchen.pos.networking

import com.desktopkitchen.pos.configuration.ServerConfig
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

class HeaderInterceptor @Inject constructor(
    private val serverConfig: ServerConfig
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val builder = chain.request().newBuilder()
            .addHeader("Content-Type", "application/json")
            .addHeader("X-Tenant-ID", serverConfig.tenantID)

        val secret = serverConfig.adminSecret
        if (secret.isNotEmpty()) {
            builder.addHeader("X-Admin-Secret", secret)
        }

        AuthTokenStore.token?.let { token ->
            builder.addHeader("Authorization", "Bearer $token")
        }

        return chain.proceed(builder.build())
    }
}
