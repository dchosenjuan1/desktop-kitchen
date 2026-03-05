package com.desktopkitchen.pos.viewmodels

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.desktopkitchen.pos.models.Order
import com.desktopkitchen.pos.services.OrderService
import com.desktopkitchen.pos.utilities.DateFormatters
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class KitchenViewModel @Inject constructor(
    private val orderService: OrderService
) : ViewModel() {

    var orders by mutableStateOf<List<Order>>(emptyList())
        private set
    var isLoading by mutableStateOf(true)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var currentTimeMillis by mutableLongStateOf(System.currentTimeMillis())
        private set

    private var pollingJob: Job? = null
    private var timerJob: Job? = null

    val pendingCount: Int
        get() = orders.count { it.status == "pending" }

    fun startPolling() {
        pollingJob?.cancel()
        pollingJob = viewModelScope.launch {
            fetchOrders()
            while (isActive) {
                delay(5000)
                fetchOrders()
            }
        }

        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (isActive) {
                delay(1000)
                currentTimeMillis = System.currentTimeMillis()
            }
        }
    }

    fun stopPolling() {
        pollingJob?.cancel()
        timerJob?.cancel()
    }

    private suspend fun fetchOrders() {
        try {
            val data = orderService.getKitchenOrders()
            val statusRank = mapOf("pending" to 0, "preparing" to 1, "confirmed" to 2)
            orders = data
                .filter { it.status != "completed" && it.status != "cancelled" }
                .sortedWith(compareBy<Order> { statusRank[it.status] ?: 3 }
                    .thenByDescending { it.created_at ?: "" })
            error = null
        } catch (e: Exception) {
            error = e.message
        }
        isLoading = false
    }

    fun startOrder(id: Int) {
        viewModelScope.launch {
            try {
                orderService.updateStatus(id, "preparing")
                fetchOrders()
            } catch (e: Exception) {
                error = e.message
            }
        }
    }

    fun markReady(id: Int) {
        viewModelScope.launch {
            try {
                orderService.updateStatus(id, "ready")
                fetchOrders()
            } catch (e: Exception) {
                error = e.message
            }
        }
    }

    fun elapsedSeconds(order: Order): Int {
        val created = order.created_at ?: return 0
        return DateFormatters.elapsedSeconds(created)
    }

    fun isUrgent(order: Order): Boolean = elapsedSeconds(order) > 600

    override fun onCleared() {
        super.onCleared()
        stopPolling()
    }
}
