package com.desktopkitchen.pos.viewmodels

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.desktopkitchen.pos.models.CartItem
import com.desktopkitchen.pos.models.CreateOrderItem
import com.desktopkitchen.pos.models.MenuCategory
import com.desktopkitchen.pos.models.MenuItem
import com.desktopkitchen.pos.models.Order
import com.desktopkitchen.pos.services.MenuService
import com.desktopkitchen.pos.services.ModifierService
import com.desktopkitchen.pos.services.OrderService
import com.desktopkitchen.pos.services.PaymentService
import com.desktopkitchen.pos.utilities.CurrencyFormatter
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class POSViewModel @Inject constructor(
    private val menuService: MenuService,
    private val orderService: OrderService,
    private val paymentService: PaymentService,
    private val modifierService: ModifierService
) : ViewModel() {

    // Data
    var categories by mutableStateOf<List<MenuCategory>>(emptyList())
        private set
    var menuItems by mutableStateOf<List<MenuItem>>(emptyList())
        private set
    val cart = mutableStateListOf<CartItem>()

    // UI State
    var selectedCategoryId by mutableStateOf<Int?>(null)
    var searchQuery by mutableStateOf("")
    var isLoading by mutableStateOf(true)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    // Payment
    var showPaymentSheet by mutableStateOf(false)
    var isProcessingPayment by mutableStateOf(false)
        private set
    var showOrderConfirmation by mutableStateOf(false)
    var confirmedOrderNumber by mutableStateOf("")
        private set

    // Computed
    val filteredItems: List<MenuItem>
        get() {
            var items = menuItems
            selectedCategoryId?.let { catId ->
                items = items.filter { it.category_id == catId }
            }
            if (searchQuery.isNotBlank()) {
                val query = searchQuery.lowercase()
                items = items.filter {
                    it.name.lowercase().contains(query) ||
                    (it.description?.lowercase()?.contains(query) == true)
                }
            }
            return items
        }

    val cartTotal: Double
        get() = cart.sumOf { it.lineTotal }

    val subtotal: Double
        get() = CurrencyFormatter.extractSubtotal(cartTotal)

    val tax: Double
        get() = CurrencyFormatter.extractTax(cartTotal)

    // Load Data
    fun loadData() {
        viewModelScope.launch {
            isLoading = true
            try {
                val cats = menuService.getCategories()
                val items = menuService.getMenuItems()
                categories = cats
                menuItems = items
                error = null
            } catch (e: Exception) {
                error = e.message
            }
            isLoading = false
        }
    }

    // Cart Operations
    fun addToCart(item: MenuItem) {
        val existingIndex = cart.indexOfFirst { it.menuItemId == item.id && it.selectedModifierIds == null }
        if (existingIndex >= 0) {
            val existing = cart[existingIndex]
            cart[existingIndex] = existing.copy(quantity = existing.quantity + 1)
        } else {
            cart.add(
                CartItem(
                    cartId = UUID.randomUUID().toString(),
                    menuItemId = item.id,
                    itemName = item.name,
                    quantity = 1,
                    unitPrice = item.price,
                    menuItem = item
                )
            )
        }
    }

    fun removeFromCart(cartId: String) {
        cart.removeAll { it.cartId == cartId }
    }

    fun updateQuantity(cartId: String, quantity: Int) {
        if (quantity <= 0) {
            removeFromCart(cartId)
        } else {
            val index = cart.indexOfFirst { it.cartId == cartId }
            if (index >= 0) {
                cart[index] = cart[index].copy(quantity = quantity)
            }
        }
    }

    fun clearCart() {
        cart.clear()
    }

    // Payment
    fun processCardPayment(employeeId: Int, tip: Double = 0.0) {
        if (cart.isEmpty()) return
        viewModelScope.launch {
            isProcessingPayment = true
            try {
                val items = cart.map {
                    CreateOrderItem(
                        menu_item_id = it.menuItemId,
                        quantity = it.quantity,
                        notes = it.notes,
                        modifiers = it.selectedModifierIds
                    )
                }
                val order = orderService.createOrder(employeeId, items)
                val intent = paymentService.createIntent(order.id, tip)
                paymentService.confirm(order.id, intent.payment_intent_id)

                showPaymentSheet = false
                confirmedOrderNumber = order.order_number
                showOrderConfirmation = true
                cart.clear()
            } catch (e: Exception) {
                error = e.message
            }
            isProcessingPayment = false
        }
    }

    fun processCashPayment(employeeId: Int, tip: Double = 0.0) {
        if (cart.isEmpty()) return
        viewModelScope.launch {
            isProcessingPayment = true
            try {
                val items = cart.map {
                    CreateOrderItem(
                        menu_item_id = it.menuItemId,
                        quantity = it.quantity,
                        notes = it.notes,
                        modifiers = it.selectedModifierIds
                    )
                }
                val order = orderService.createOrder(employeeId, items)
                paymentService.cashPayment(order.id, tip)

                showPaymentSheet = false
                confirmedOrderNumber = order.order_number
                showOrderConfirmation = true
                cart.clear()
            } catch (e: Exception) {
                error = e.message
            }
            isProcessingPayment = false
        }
    }

    fun dismissOrderConfirmation() {
        showOrderConfirmation = false
        confirmedOrderNumber = ""
    }
}
