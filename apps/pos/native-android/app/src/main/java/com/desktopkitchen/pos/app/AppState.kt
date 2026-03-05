package com.desktopkitchen.pos.app

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.desktopkitchen.pos.models.Employee
import com.desktopkitchen.pos.networking.AuthTokenStore
import javax.inject.Inject
import javax.inject.Singleton

enum class Screen {
    Login,
    POS,
    Kitchen,
    Admin,
    Reports,
    Inventory,
    Employees,
    MenuManagement,
    Kiosk
}

@Singleton
class AppState @Inject constructor() {
    var currentScreen by mutableStateOf(Screen.Login)
        private set
    var currentEmployee by mutableStateOf<Employee?>(null)
        private set

    val isLoggedIn: Boolean get() = currentEmployee != null

    fun navigate(screen: Screen) {
        currentScreen = screen
    }

    fun loginSucceeded(employee: Employee) {
        currentEmployee = employee
        AuthTokenStore.token = employee.token
        currentScreen = if (employee.role == "kitchen") Screen.Kitchen else Screen.POS
    }

    fun logout() {
        currentEmployee = null
        AuthTokenStore.token = null
        currentScreen = Screen.Login
    }
}
