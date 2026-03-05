package com.desktopkitchen.pos.networking.api

import com.desktopkitchen.pos.models.Employee
import retrofit2.http.Body
import retrofit2.http.POST

data class LoginRequest(val pin: String)

interface AuthApi {
    @POST("api/employees/login")
    suspend fun login(@Body request: LoginRequest): Employee
}
