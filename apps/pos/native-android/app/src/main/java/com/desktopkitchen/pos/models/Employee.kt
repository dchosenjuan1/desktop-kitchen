package com.desktopkitchen.pos.models

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class Employee(
    val id: Int,
    val name: String,
    val pin: String? = null,
    val role: String,
    val active: Boolean = true,
    val created_at: String? = null,
    val token: String? = null
) {
    val displayRole: String get() = role.replaceFirstChar { it.uppercase() }
}
