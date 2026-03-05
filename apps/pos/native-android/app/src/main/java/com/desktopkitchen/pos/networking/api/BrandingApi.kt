package com.desktopkitchen.pos.networking.api

import com.desktopkitchen.pos.models.TenantBranding
import retrofit2.http.GET

interface BrandingApi {
    @GET("api/branding")
    suspend fun getBranding(): TenantBranding
}
