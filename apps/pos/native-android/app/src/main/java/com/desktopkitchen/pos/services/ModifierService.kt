package com.desktopkitchen.pos.services

import com.desktopkitchen.pos.models.ModifierGroup
import com.desktopkitchen.pos.networking.api.ModifierApi
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ModifierService @Inject constructor(
    private val modifierApi: ModifierApi
) {
    suspend fun getGroupsForItem(menuItemId: Int): List<ModifierGroup> =
        modifierApi.getGroupsForItem(menuItemId)
}
