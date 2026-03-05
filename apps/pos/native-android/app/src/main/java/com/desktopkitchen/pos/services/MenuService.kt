package com.desktopkitchen.pos.services

import com.desktopkitchen.pos.models.MenuCategory
import com.desktopkitchen.pos.models.MenuItem
import com.desktopkitchen.pos.networking.api.MenuApi
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MenuService @Inject constructor(
    private val menuApi: MenuApi
) {
    suspend fun getCategories(): List<MenuCategory> = menuApi.getCategories()

    suspend fun getMenuItems(categoryId: Int? = null): List<MenuItem> = menuApi.getItems(categoryId)
}
