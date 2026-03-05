package com.desktopkitchen.pos.viewmodels

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.desktopkitchen.pos.models.Employee
import com.desktopkitchen.pos.services.AuthService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authService: AuthService
) : ViewModel() {

    var pin by mutableStateOf("")
        private set
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var shake by mutableStateOf(false)
        private set

    val dots: List<Boolean>
        get() = (0 until 4).map { it < pin.length }

    fun appendDigit(digit: String, onLogin: (Employee) -> Unit) {
        if (pin.length >= 4) return
        pin += digit
        error = null

        if (pin.length == 4) {
            attemptLogin(onLogin)
        }
    }

    fun backspace() {
        if (pin.isNotEmpty()) {
            pin = pin.dropLast(1)
            error = null
        }
    }

    fun clear() {
        pin = ""
        error = null
    }

    private fun attemptLogin(onLogin: (Employee) -> Unit) {
        viewModelScope.launch {
            isLoading = true
            try {
                val employee = authService.login(pin)
                onLogin(employee)
            } catch (e: Exception) {
                error = e.message ?: "Login failed"
                triggerShake()
                pin = ""
            } finally {
                isLoading = false
            }
        }
    }

    private fun triggerShake() {
        shake = true
        viewModelScope.launch {
            delay(500)
            shake = false
        }
    }
}
