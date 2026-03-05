package com.desktopkitchen.pos.models

import com.squareup.moshi.JsonClass
import java.util.UUID

@JsonClass(generateAdapter = true)
data class Order(
    val id: Int,
    val order_number: String,
    val employee_id: Int? = null,
    val employee_name: String? = null,
    val status: String,
    val subtotal: Double? = null,
    val tax: Double? = null,
    val tip: Double? = null,
    val total: Double? = null,
    val payment_intent_id: String? = null,
    val payment_status: String? = null,
    val payment_method: String? = null,
    val source: String? = null,
    val created_at: String? = null,
    val completed_at: String? = null,
    val items: List<OrderItem>? = null
)

@JsonClass(generateAdapter = true)
data class OrderItem(
    val id: Int? = null,
    val order_id: Int? = null,
    val menu_item_id: Int? = null,
    val item_name: String,
    val quantity: Int,
    val unit_price: Double? = null,
    val notes: String? = null,
    val combo_instance_id: String? = null,
    val modifiers: List<OrderItemModifier>? = null
)

@JsonClass(generateAdapter = true)
data class OrderItemModifier(
    val id: Int? = null,
    val order_item_id: Int? = null,
    val modifier_id: Int? = null,
    val modifier_name: String,
    val price_adjustment: Double = 0.0
)

data class CartItem(
    val cartId: String = UUID.randomUUID().toString(),
    val menuItemId: Int,
    val itemName: String,
    var quantity: Int,
    val unitPrice: Double,
    var notes: String? = null,
    val comboInstanceId: String? = null,
    val menuItem: MenuItem? = null,
    val selectedModifierIds: List<Int>? = null,
    val selectedModifierNames: List<String>? = null
) {
    val lineTotal: Double get() = unitPrice * quantity
}

@JsonClass(generateAdapter = true)
data class CreateOrderRequest(
    val employee_id: Int,
    val items: List<CreateOrderItem>
)

@JsonClass(generateAdapter = true)
data class CreateOrderItem(
    val menu_item_id: Int,
    val quantity: Int,
    val notes: String? = null,
    val modifiers: List<Int>? = null,
    val combo_instance_id: String? = null
)
