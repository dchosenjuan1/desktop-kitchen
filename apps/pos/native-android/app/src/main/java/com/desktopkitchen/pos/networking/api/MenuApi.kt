package com.desktopkitchen.pos.networking.api

import com.desktopkitchen.pos.models.MenuCategory
import com.desktopkitchen.pos.models.MenuItem
import retrofit2.http.GET
import retrofit2.http.Query

interface MenuApi {
    @GET("api/menu/categories")
    suspend fun getCategories(): List<MenuCategory>

    @GET("api/menu/items")
    suspend fun getItems(@Query("category_id") categoryId: Int? = null): List<MenuItem>
}
