import SwiftUI

@Observable @MainActor
final class POSViewModel {
    // MARK: - Mode

    let isKioskMode: Bool

    init(isKioskMode: Bool = false) {
        self.isKioskMode = isKioskMode
    }

    // MARK: - Data

    var categories: [MenuCategory] = []
    var menuItems: [MenuItem] = []
    var cart: [CartItem] = []

    // MARK: - UI State

    var selectedCategoryId: Int? = nil  // nil = "All"
    var searchQuery = ""
    var isLoading = true
    var error: String?

    // MARK: - Sheets

    var notesItem: CartItem?
    var showPaymentSheet = false
    var showReceiptSheet = false
    var completedOrder: Order?
    var isProcessingPayment = false

    // MARK: - Modifier Sheet (Phase 1)

    var showModifierSheet = false
    var modifierItem: MenuItem?
    var modifierGroups: [ModifierGroup] = []
    var isLoadingModifiers = false
    private var modifierGroupsCache: [Int: [ModifierGroup]] = [:]

    // MARK: - Order Confirmation (Phase 1)

    var showOrderConfirmation = false
    var confirmedOrderNumber = ""

    // MARK: - Discounts (Phase 2)

    var discountType: DiscountType = .none
    var discountValue: Double = 0
    var showDiscountPopover = false

    // MARK: - Hold / Recall (Phase 2)

    var heldOrders: [HeldOrder] = []
    var showHeldOrdersPopover = false

    // MARK: - Running Till (Phase 2)

    var tillTotal: Double = 0
    var tillOrderCount: Int = 0
    private var tillTask: Task<Void, Never>?

    // MARK: - Split Payment (Phase 2)

    var showSplitSheet = false
    var splitOrderId: Int?

    // MARK: - Order History (Phase 3)

    var showOrderHistory = false

    // MARK: - Delivery Orders (Phase 3)

    var deliveryOrders: [DeliveryOrder] = []
    private var deliveryTask: Task<Void, Never>?

    // MARK: - Loyalty (Phase 4)

    var linkedCustomer: LoyaltyCustomer?
    var showCustomerLookup = false

    // MARK: - Toast

    var toasts: [ToastMessage] = []

    // MARK: - Computed

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

    /// Sum of item prices (prices already include IVA in Mexico).
    var cartTotal: Double {
        cart.reduce(0) { $0 + $1.lineTotal }
    }

    var discountAmount: Double {
        switch discountType {
        case .none: return 0
        case .percent: return (cartTotal * discountValue / 100 * 100).rounded() / 100
        case .fixed: return min(discountValue, cartTotal)
        }
    }

    /// What the customer pays (prices include IVA, minus any discount).
    var total: Double {
        cartTotal - discountAmount
    }

    /// Pre-tax subtotal (extracted from the tax-inclusive total, for display).
    var subtotal: Double {
        CurrencyFormatter.extractSubtotal(fromTotal: total)
    }

    /// IVA extracted from the tax-inclusive total (for display).
    var tax: Double {
        CurrencyFormatter.extractTax(fromTotal: total)
    }

    var cartIsEmpty: Bool { cart.isEmpty }

    var hasModifiers: Bool {
        !modifierGroupsCache.isEmpty
    }

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

        if !isKioskMode {
            startTillPolling()
            startDeliveryPolling()
        }
    }

    // MARK: - Item Tap (Modifier handling)

    func handleItemTap(item: MenuItem) {
        if let cached = modifierGroupsCache[item.id] {
            if cached.isEmpty {
                addToCart(item: item)
            } else {
                openModifierSheet(item: item, groups: cached)
            }
        } else {
            isLoadingModifiers = true
            Task {
                do {
                    let groups = try await ModifierService.getGroupsForItem(menuItemId: item.id)
                    modifierGroupsCache[item.id] = groups
                    if groups.isEmpty {
                        addToCart(item: item)
                    } else {
                        openModifierSheet(item: item, groups: groups)
                    }
                } catch {
                    // Fetch failed — add without modifiers
                    addToCart(item: item)
                }
                isLoadingModifiers = false
            }
        }
    }

    private func openModifierSheet(item: MenuItem, groups: [ModifierGroup]) {
        modifierItem = item
        modifierGroups = groups
        showModifierSheet = true
    }

    func addToCartWithModifiers(item: MenuItem, selectedModifierIds: [Int]) {
        let allModifiers = modifierGroups.flatMap { $0.modifiers ?? [] }
        let selected = allModifiers.filter { selectedModifierIds.contains($0.id) }
        let modifierTotal = selected.reduce(0.0) { $0 + $1.price_adjustment }
        let unitPrice = item.price + modifierTotal

        cart.append(CartItem(
            cart_id: UUID().uuidString,
            menu_item_id: item.id,
            item_name: item.name,
            quantity: 1,
            unit_price: unitPrice,
            menuItem: item,
            selectedModifierIds: selected.map { $0.id },
            selectedModifierNames: selected.map { $0.name }
        ))

        showModifierSheet = false
    }

    /// Check if a menu item has modifiers (from cache).
    func itemHasModifiers(_ itemId: Int) -> Bool {
        if let cached = modifierGroupsCache[itemId] {
            return !cached.isEmpty
        }
        return false
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
        clearDiscount()
        linkedCustomer = nil
    }

    // MARK: - Discounts (Phase 2)

    func applyDiscount(type: DiscountType, value: Double) {
        discountType = type
        discountValue = value
        showDiscountPopover = false
    }

    func clearDiscount() {
        discountType = .none
        discountValue = 0
    }

    // MARK: - Hold / Recall (Phase 2)

    func holdCurrentOrder() {
        guard !cart.isEmpty else { return }
        let held = HeldOrder(
            id: UUID().uuidString,
            items: cart,
            timestamp: Date(),
            discountType: discountType,
            discountValue: discountValue,
            customerName: linkedCustomer?.name,
            customerId: linkedCustomer?.id
        )
        heldOrders.append(held)
        cart = []
        clearDiscount()
        linkedCustomer = nil
        addToast("Order held (\(heldOrders.count))", type: .info)
    }

    func recallOrder(_ order: HeldOrder) {
        // If current cart isn't empty, hold it first
        if !cart.isEmpty {
            holdCurrentOrder()
        }
        cart = order.items
        discountType = order.discountType
        discountValue = order.discountValue
        heldOrders.removeAll { $0.id == order.id }
        showHeldOrdersPopover = false
        addToast("Order recalled", type: .info)
    }

    func deleteHeldOrder(_ order: HeldOrder) {
        heldOrders.removeAll { $0.id == order.id }
    }

    // MARK: - Running Till (Phase 2)

    private func startTillPolling() {
        tillTask?.cancel()
        tillTask = Task { @MainActor [weak self] in
            while !Task.isCancelled {
                await self?.fetchTillTotal()
                try? await Task.sleep(for: .seconds(30))
            }
        }
    }

    private func fetchTillTotal() async {
        do {
            let report: LiveDashboardData = try await APIClient.shared.request(ReportEndpoints.live())
            tillTotal = report.kpis.revenue ?? 0
            tillOrderCount = report.kpis.order_count ?? 0
        } catch {
            // silently fail
        }
    }

    // MARK: - Delivery Polling (Phase 3)

    private func startDeliveryPolling() {
        deliveryTask?.cancel()
        deliveryTask = Task { @MainActor [weak self] in
            while !Task.isCancelled {
                await self?.fetchDeliveryOrders()
                try? await Task.sleep(for: .seconds(15))
            }
        }
    }

    private func fetchDeliveryOrders() async {
        do {
            deliveryOrders = try await DeliveryService.getOrders()
        } catch {
            // silently fail
        }
    }

    // MARK: - Loyalty (Phase 4)

    func linkCustomer(_ customer: LoyaltyCustomer) {
        linkedCustomer = customer
        showCustomerLookup = false
        addToast("Linked \(customer.name ?? customer.phone)", type: .success)
    }

    func unlinkCustomer() {
        linkedCustomer = nil
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

            // Auto-stamp loyalty
            await stampLoyalty(orderId: order.id)

            showPaymentSheet = false
            confirmedOrderNumber = order.order_number
            showOrderConfirmation = true
            cart = []
            clearDiscount()
            linkedCustomer = nil
            addToast("Order \(order.order_number) completed!", type: .success)
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

            // Auto-stamp loyalty
            await stampLoyalty(orderId: order.id)

            showPaymentSheet = false
            confirmedOrderNumber = order.order_number
            showOrderConfirmation = true
            cart = []
            clearDiscount()
            linkedCustomer = nil
            addToast("Cash payment — Order \(order.order_number)", type: .success)
        } catch {
            addToast(error.localizedDescription, type: .error)
        }
        isProcessingPayment = false
    }

    /// Process split payment (creates order first, then delegates to SplitPaymentSheet).
    func startSplitPayment(employeeId: Int) async {
        guard !cart.isEmpty else {
            addToast("Cart is empty", type: .error)
            return
        }

        isProcessingPayment = true
        do {
            let items = cart.map { $0.toCreateOrderItem() }
            let order = try await OrderService.createOrder(employeeId: employeeId, items: items)
            splitOrderId = order.id
            completedOrder = order
            showPaymentSheet = false
            showSplitSheet = true
        } catch {
            addToast(error.localizedDescription, type: .error)
        }
        isProcessingPayment = false
    }

    func onSplitPaymentComplete() {
        if let order = completedOrder {
            confirmedOrderNumber = order.order_number
        }
        showSplitSheet = false
        showOrderConfirmation = true
        cart = []
        clearDiscount()
        linkedCustomer = nil
        addToast("Split payment completed!", type: .success)
    }

    private func stampLoyalty(orderId: Int) async {
        guard let customer = linkedCustomer else { return }
        do {
            let result = try await LoyaltyService.addStamps(customerId: customer.id, orderId: orderId)
            if result.card_completed {
                addToast("Card complete! \(result.reward_description ?? "Reward ready")", type: .success)
            } else {
                addToast("Stamp \(result.stamps_earned)/\(result.stamps_required)", type: .info)
            }
        } catch {
            // Stamp failure shouldn't block checkout
        }
    }

    func dismissOrderConfirmation() {
        showOrderConfirmation = false
        confirmedOrderNumber = ""
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

    // MARK: - Cleanup

    func stopPolling() {
        tillTask?.cancel()
        deliveryTask?.cancel()
    }
}

// MARK: - Supporting Types

struct ToastMessage: Identifiable {
    let id = UUID()
    let message: String
    let type: ToastType
}

enum ToastType {
    case success, error, info
}

enum DiscountType: Sendable {
    case none, percent, fixed
}

struct HeldOrder: Identifiable, Sendable {
    let id: String
    let items: [CartItem]
    let timestamp: Date
    let discountType: DiscountType
    let discountValue: Double
    let customerName: String?
    let customerId: Int?
}
