package com.desktopkitchen.pos.models

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class MenuCategory(
    val id: Int,
    val name: String,
    val sort_order: Int = 0,
    val active: Boolean = true
)

@JsonClass(generateAdapter = true)
data class MenuItem(
    val id: Int,
    val category_id: Int,
    val name: String,
    val price: Double,
    val description: String? = null,
    val image_url: String? = null,
    val active: Boolean = true
)
