package com.desktopkitchen.pos.services

import com.desktopkitchen.pos.models.CashPaymentRequest
import com.desktopkitchen.pos.models.ConfirmPaymentRequest
import com.desktopkitchen.pos.models.CreatePaymentIntentRequest
import com.desktopkitchen.pos.models.PaymentIntent
import com.desktopkitchen.pos.models.PaymentStatus
import com.desktopkitchen.pos.networking.api.PaymentApi
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PaymentService @Inject constructor(
    private val paymentApi: PaymentApi
) {
    suspend fun createIntent(orderId: Int, tip: Double? = null): PaymentIntent =
        paymentApi.createIntent(CreatePaymentIntentRequest(order_id = orderId, tip = tip))

    suspend fun confirm(orderId: Int, paymentIntentId: String) {
        paymentApi.confirm(ConfirmPaymentRequest(order_id = orderId, payment_intent_id = paymentIntentId))
    }

    suspend fun cashPayment(orderId: Int, tip: Double? = null) {
        paymentApi.cashPayment(CashPaymentRequest(order_id = orderId, tip = tip))
    }

    suspend fun getStatus(orderId: Int): PaymentStatus = paymentApi.getStatus(orderId)
}
