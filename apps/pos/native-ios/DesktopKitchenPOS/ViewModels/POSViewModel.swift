import SwiftUI

@Observable @MainActor
final class POSViewModel {
    // Data
    var categories: [MenuCategory] = []
    var menuItems: [MenuItem] = []
    var cart: [CartItem] = []

    // UI State
    var selectedCategoryId: Int? = nil  // nil = "All"
    var searchQuery = ""
    var isLoading = true
    var error: String?

    // Sheets
    var notesItem: CartItem?
    var showPaymentSheet = false
    var showReceiptSheet = false
    var completedOrder: Order?
    var isProcessingPayment = false

    // Toast
    var toasts: [ToastMessage] = []

    // Computed
    var filteredItems: [MenuItem] {
        var items = menuItems

        if let catId = selectedCategoryId {
            items = items.filter { $0.category_id == catId }
        }

        if !searchQuery.isEmpty {
            let query = searchQuery.lowercased()
            items = items.filter {
                $0.name.lowercased().contains(query) ||
                ($0.description?.lowercased().contains(query) ?? false)
            }
        }

        return items
    }

    var subtotal: Double {
        cart.reduce(0) { $0 + $1.lineTotal }
    }

    var tax: Double {
        CurrencyFormatter.calculateTax(subtotal: subtotal)
    }

    var total: Double {
        subtotal + tax
    }

    var cartIsEmpty: Bool { cart.isEmpty }

    // MARK: - Load Data

    func loadData() async {
        isLoading = true
        do {
            async let cats = MenuService.getCategories()
            async let items = MenuService.getMenuItems()
            categories = try await cats
            menuItems = try await items
            error = nil
        } catch {
            self.error = error.localizedDescription
            addToast("Failed to load menu", type: .error)
        }
        isLoading = false
    }

    // MARK: - Cart Operations

    func addToCart(item: MenuItem) {
        // Group by menu_item_id when no modifiers are involved
        if let index = cart.firstIndex(where: { $0.menu_item_id == item.id && $0.selectedModifierIds == nil }) {
            cart[index].quantity += 1
        } else {
            cart.append(CartItem(
                cart_id: UUID().uuidString,
                menu_item_id: item.id,
                item_name: item.name,
                quantity: 1,
                unit_price: item.price,
                menuItem: item
            ))
        }
    }

    func removeFromCart(cartId: String) {
        cart.removeAll { $0.cart_id == cartId }
    }

    func updateQuantity(cartId: String, quantity: Int) {
        if quantity <= 0 {
            removeFromCart(cartId: cartId)
        } else if let index = cart.firstIndex(where: { $0.cart_id == cartId }) {
            cart[index].quantity = quantity
        }
    }

    func updateNotes(cartId: String, notes: String) {
        if let index = cart.firstIndex(where: { $0.cart_id == cartId }) {
            cart[index].notes = notes.isEmpty ? nil : notes
        }
    }

    func clearCart() {
        cart = []
    }

    // MARK: - Payment

    func processCardPayment(employeeId: Int, tip: Double) async {
        guard !cart.isEmpty else {
            addToast("Cart is empty", type: .error)
            return
        }

        isProcessingPayment = true
        do {
            let items = cart.map { $0.toCreateOrderItem() }
            let order = try await OrderService.createOrder(employeeId: employeeId, items: items)

            let paymentIntent = try await PaymentService.createIntent(orderId: order.id, tip: tip)
            try await PaymentService.confirm(orderId: order.id, paymentIntentId: paymentIntent.payment_intent_id)

            var finalOrder = order
            finalOrder.tip = tip
            finalOrder.total = order.subtotal + order.tax + tip

            completedOrder = finalOrder
            showPaymentSheet = false
            showReceiptSheet = true
            clearCart()
            addToast("Order completed!", type: .success)
        } catch {
            addToast(error.localizedDescription, type: .error)
        }
        isProcessingPayment = false
    }

    func processCashPayment(employeeId: Int, tip: Double) async {
        guard !cart.isEmpty else {
            addToast("Cart is empty", type: .error)
            return
        }

        isProcessingPayment = true
        do {
            let items = cart.map { $0.toCreateOrderItem() }
            let order = try await OrderService.createOrder(employeeId: employeeId, items: items)

            try await PaymentService.cashPayment(orderId: order.id, tip: tip)

            var finalOrder = order
            finalOrder.tip = tip
            finalOrder.total = order.subtotal + order.tax + tip

            completedOrder = finalOrder
            showPaymentSheet = false
            showReceiptSheet = true
            clearCart()
            addToast("Cash payment completed!", type: .success)
        } catch {
            addToast(error.localizedDescription, type: .error)
        }
        isProcessingPayment = false
    }

    // MARK: - Toast

    func addToast(_ message: String, type: ToastType = .info) {
        let toast = ToastMessage(message: message, type: type)
        toasts.append(toast)
        let toastId = toast.id

        Task { @MainActor [weak self] in
            try? await Task.sleep(for: .seconds(3))
            self?.toasts.removeAll { $0.id == toastId }
        }
    }
}

// MARK: - Toast Types

struct ToastMessage: Identifiable {
    let id = UUID()
    let message: String
    let type: ToastType
}

enum ToastType {
    case success, error, info
}
