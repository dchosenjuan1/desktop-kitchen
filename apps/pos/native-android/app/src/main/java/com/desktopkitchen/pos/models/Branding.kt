package com.desktopkitchen.pos.models

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class TenantBranding(
    val primaryColor: String? = null,
    val logoUrl: String? = null,
    val restaurantName: String? = null
)
