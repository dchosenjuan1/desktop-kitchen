package com.desktopkitchen.pos.networking.api

import com.desktopkitchen.pos.models.ModifierGroup
import retrofit2.http.GET
import retrofit2.http.Path

interface ModifierApi {
    @GET("api/modifiers/item/{menuItemId}")
    suspend fun getGroupsForItem(@Path("menuItemId") menuItemId: Int): List<ModifierGroup>
}
