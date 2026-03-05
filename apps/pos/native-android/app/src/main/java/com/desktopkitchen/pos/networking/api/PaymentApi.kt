package com.desktopkitchen.pos.networking.api

import com.desktopkitchen.pos.models.CashPaymentRequest
import com.desktopkitchen.pos.models.ConfirmPaymentRequest
import com.desktopkitchen.pos.models.CreatePaymentIntentRequest
import com.desktopkitchen.pos.models.PaymentIntent
import com.desktopkitchen.pos.models.PaymentStatus
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface PaymentApi {
    @POST("api/payments/create-intent")
    suspend fun createIntent(@Body request: CreatePaymentIntentRequest): PaymentIntent

    @POST("api/payments/confirm")
    suspend fun confirm(@Body request: ConfirmPaymentRequest)

    @POST("api/payments/cash")
    suspend fun cashPayment(@Body request: CashPaymentRequest)

    @GET("api/payments/{orderId}")
    suspend fun getStatus(@Path("orderId") orderId: Int): PaymentStatus
}
