package com.desktopkitchen.pos.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.hilt.navigation.compose.hiltViewModel
import com.desktopkitchen.pos.app.AppState
import com.desktopkitchen.pos.app.Screen
import com.desktopkitchen.pos.services.BrandingService
import com.desktopkitchen.pos.ui.screens.kitchen.KitchenScreen
import com.desktopkitchen.pos.ui.screens.login.LoginScreen
import com.desktopkitchen.pos.ui.screens.pos.POSScreen
import com.desktopkitchen.pos.ui.screens.reports.ReportsScreen
import com.desktopkitchen.pos.ui.theme.AppColors
import com.desktopkitchen.pos.viewmodels.KitchenViewModel
import com.desktopkitchen.pos.viewmodels.LoginViewModel
import com.desktopkitchen.pos.viewmodels.POSViewModel
import com.desktopkitchen.pos.viewmodels.ReportsViewModel
import javax.inject.Inject

@Composable
fun RootNavigation(
    appState: AppState = hiltViewModel<RootNavigationViewModel>().appState
) {
    // Load branding on launch
    val rootVM = hiltViewModel<RootNavigationViewModel>()
    LaunchedEffect(Unit) {
        rootVM.loadBranding()
    }

    when (appState.currentScreen) {
        Screen.Login -> {
            val vm = hiltViewModel<LoginViewModel>()
            LoginScreen(viewModel = vm, appState = appState)
        }
        Screen.POS -> {
            val vm = hiltViewModel<POSViewModel>()
            POSScreen(viewModel = vm, appState = appState)
        }
        Screen.Kitchen -> {
            val vm = hiltViewModel<KitchenViewModel>()
            KitchenScreen(viewModel = vm, appState = appState)
        }
        Screen.Reports -> {
            val vm = hiltViewModel<ReportsViewModel>()
            ReportsScreen(viewModel = vm, appState = appState)
        }
        else -> {
            // Other screens not yet implemented — fallback to POS
            val vm = hiltViewModel<POSViewModel>()
            POSScreen(viewModel = vm, appState = appState)
        }
    }
}
