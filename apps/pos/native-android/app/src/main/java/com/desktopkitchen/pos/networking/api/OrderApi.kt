package com.desktopkitchen.pos.networking.api

import com.desktopkitchen.pos.models.CreateOrderRequest
import com.desktopkitchen.pos.models.Order
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface OrderApi {
    @GET("api/orders")
    suspend fun getOrders(
        @Query("status") status: String? = null,
        @Query("date") date: String? = null
    ): List<Order>

    @GET("api/orders/{id}")
    suspend fun getOrder(@Path("id") id: Int): Order

    @POST("api/orders")
    suspend fun createOrder(@Body request: CreateOrderRequest): Order

    @PUT("api/orders/{id}/status")
    suspend fun updateStatus(
        @Path("id") id: Int,
        @Body body: Map<String, String>
    )

    @GET("api/orders/kitchen/active")
    suspend fun getKitchenOrders(): List<Order>
}
