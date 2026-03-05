package com.desktopkitchen.pos.services

import com.desktopkitchen.pos.models.TenantBranding
import com.desktopkitchen.pos.networking.api.BrandingApi
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BrandingService @Inject constructor(
    private val brandingApi: BrandingApi
) {
    suspend fun getBranding(): TenantBranding = brandingApi.getBranding()
}
