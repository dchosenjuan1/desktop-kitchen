package com.desktopkitchen.pos.models

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ModifierGroup(
    val id: Int,
    val name: String,
    val selection_type: String,
    val required: Boolean = false,
    val min_selections: Int = 0,
    val max_selections: Int = 0,
    val sort_order: Int = 0,
    val active: Boolean = true,
    val modifiers: List<ModifierItem>? = null
)

@JsonClass(generateAdapter = true)
data class ModifierItem(
    val id: Int,
    val group_id: Int,
    val name: String,
    val price_adjustment: Double = 0.0,
    val sort_order: Int = 0,
    val active: Boolean = true
)
