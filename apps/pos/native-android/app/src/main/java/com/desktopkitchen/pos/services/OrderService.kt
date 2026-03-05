package com.desktopkitchen.pos.services

import com.desktopkitchen.pos.models.CreateOrderItem
import com.desktopkitchen.pos.models.CreateOrderRequest
import com.desktopkitchen.pos.models.Order
import com.desktopkitchen.pos.networking.api.OrderApi
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OrderService @Inject constructor(
    private val orderApi: OrderApi
) {
    suspend fun getOrders(status: String? = null): List<Order> = orderApi.getOrders(status)

    suspend fun getOrder(id: Int): Order = orderApi.getOrder(id)

    suspend fun createOrder(employeeId: Int, items: List<CreateOrderItem>): Order =
        orderApi.createOrder(CreateOrderRequest(employee_id = employeeId, items = items))

    suspend fun updateStatus(id: Int, status: String) {
        orderApi.updateStatus(id, mapOf("status" to status))
    }

    suspend fun getKitchenOrders(): List<Order> = orderApi.getKitchenOrders()
}
