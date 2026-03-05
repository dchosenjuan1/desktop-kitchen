package com.desktopkitchen.pos.ui.navigation

import androidx.lifecycle.ViewModel
import com.desktopkitchen.pos.app.AppState
import com.desktopkitchen.pos.services.BrandingService
import com.desktopkitchen.pos.ui.theme.AppColors
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class RootNavigationViewModel @Inject constructor(
    val appState: AppState,
    private val brandingService: BrandingService
) : ViewModel() {

    suspend fun loadBranding() {
        try {
            val branding = brandingService.getBranding()
            branding.primaryColor?.let { AppColors.applyBranding(it) }
        } catch (_: Exception) {
            // Branding is optional — use defaults
        }
    }
}
