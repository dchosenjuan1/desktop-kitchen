package com.desktopkitchen.pos.services

import com.desktopkitchen.pos.models.Employee
import com.desktopkitchen.pos.networking.api.AuthApi
import com.desktopkitchen.pos.networking.api.LoginRequest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthService @Inject constructor(
    private val authApi: AuthApi
) {
    suspend fun login(pin: String): Employee {
        return authApi.login(LoginRequest(pin = pin))
    }
}
