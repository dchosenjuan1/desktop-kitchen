import Foundation

// MARK: - Auth Endpoints

enum AuthEndpoints {
    static func login(pin: String) -> Endpoint {
        Endpoint(
            path: "/api/employees/login",
            method: .post,
            body: LoginRequest(pin: pin)
        )
    }
}

struct LoginRequest: Codable, Sendable {
    let pin: String
}

// MARK: - Employee Endpoints

enum EmployeeEndpoints {
    static func getAll() -> Endpoint {
        Endpoint(path: "/api/employees")
    }

    static func create(name: String, pin: String, role: String) -> Endpoint {
        Endpoint(
            path: "/api/employees",
            method: .post,
            body: CreateEmployeeRequest(name: name, pin: pin, role: role)
        )
    }

    static func update(id: Int, name: String?, pin: String?, role: String?) -> Endpoint {
        Endpoint(
            path: "/api/employees/\(id)",
            method: .put,
            body: UpdateEmployeeRequest(name: name, pin: pin, role: role)
        )
    }

    static func toggle(id: Int) -> Endpoint {
        Endpoint(
            path: "/api/employees/\(id)/toggle",
            method: .put
        )
    }
}

struct CreateEmployeeRequest: Codable, Sendable {
    let name: String
    let pin: String
    let role: String
}

struct UpdateEmployeeRequest: Codable, Sendable {
    let name: String?
    let pin: String?
    let role: String?
}

// MARK: - Menu Endpoints

enum MenuEndpoints {
    static func getCategories() -> Endpoint {
        Endpoint(path: "/api/menu/categories")
    }

    static func getMenuItems(categoryId: Int?) -> Endpoint {
        var queryItems: [URLQueryItem]?
        if let categoryId {
            queryItems = [URLQueryItem(name: "category_id", value: String(categoryId))]
        }
        return Endpoint(
            path: "/api/menu/items",
            queryItems: queryItems
        )
    }

    static func toggleMenuItem(id: Int) -> Endpoint {
        Endpoint(
            path: "/api/menu/items/\(id)/toggle",
            method: .put
        )
    }

    static func createMenuItem(data: CreateMenuItemRequest) -> Endpoint {
        Endpoint(
            path: "/api/menu/items",
            method: .post,
            body: data
        )
    }

    static func updateMenuItem(id: Int, data: UpdateMenuItemRequest) -> Endpoint {
        Endpoint(
            path: "/api/menu/items/\(id)",
            method: .put,
            body: data
        )
    }
}

struct CreateMenuItemRequest: Codable, Sendable {
    let category_id: Int
    let name: String
    let price: Double
    let description: String?
}

struct UpdateMenuItemRequest: Codable, Sendable {
    let category_id: Int?
    let name: String?
    let price: Double?
    let description: String?
}

// MARK: - Order Endpoints

enum OrderEndpoints {
    static func getOrders(status: String?) -> Endpoint {
        var queryItems: [URLQueryItem]?
        if let status {
            queryItems = [URLQueryItem(name: "status", value: status)]
        }
        return Endpoint(
            path: "/api/orders",
            queryItems: queryItems
        )
    }

    static func getOrder(id: Int) -> Endpoint {
        Endpoint(path: "/api/orders/\(id)")
    }

    static func createOrder(request: CreateOrderRequest) -> Endpoint {
        Endpoint(
            path: "/api/orders",
            method: .post,
            body: request
        )
    }

    static func updateStatus(id: Int, status: String) -> Endpoint {
        Endpoint(
            path: "/api/orders/\(id)/status",
            method: .put,
            body: UpdateOrderStatusRequest(status: status)
        )
    }

    static func getKitchenOrders() -> Endpoint {
        Endpoint(path: "/api/orders/kitchen/active")
    }
}

struct UpdateOrderStatusRequest: Codable, Sendable {
    let status: String
}

// MARK: - Payment Endpoints

enum PaymentEndpoints {
    static func createIntent(request: CreatePaymentIntentRequest) -> Endpoint {
        Endpoint(
            path: "/api/payments/create-intent",
            method: .post,
            body: request
        )
    }

    static func confirm(request: ConfirmPaymentRequest) -> Endpoint {
        Endpoint(
            path: "/api/payments/confirm",
            method: .post,
            body: request
        )
    }

    static func getStatus(orderId: Int) -> Endpoint {
        Endpoint(path: "/api/payments/\(orderId)")
    }

    static func cashPayment(request: CashPaymentRequest) -> Endpoint {
        Endpoint(
            path: "/api/payments/cash",
            method: .post,
            body: request
        )
    }

    static func refund(request: RefundPaymentRequest) -> Endpoint {
        Endpoint(
            path: "/api/payments/refund",
            method: .post,
            body: request
        )
    }

    static func splitPayment(request: SplitPaymentRequest) -> Endpoint {
        Endpoint(
            path: "/api/payments/split",
            method: .post,
            body: request
        )
    }

    static func getOrderSplits(orderId: Int) -> Endpoint {
        Endpoint(path: "/api/payments/split/\(orderId)")
    }
}

// MARK: - Inventory Endpoints

enum InventoryEndpoints {
    static func getAll() -> Endpoint {
        Endpoint(path: "/api/inventory")
    }

    static func getLowStock() -> Endpoint {
        Endpoint(path: "/api/inventory/low-stock")
    }

    static func restock(id: Int, quantity: Double) -> Endpoint {
        Endpoint(
            path: "/api/inventory/\(id)/restock",
            method: .post,
            body: RestockRequest(quantity: quantity)
        )
    }

    static func update(id: Int, threshold: Double) -> Endpoint {
        Endpoint(
            path: "/api/inventory/\(id)",
            method: .put,
            body: UpdateInventoryRequest(low_stock_threshold: threshold)
        )
    }
}

struct RestockRequest: Codable, Sendable {
    let quantity: Double
}

struct UpdateInventoryRequest: Codable, Sendable {
    let low_stock_threshold: Double
}

// MARK: - Report Endpoints

enum ReportEndpoints {
    static func sales(period: String) -> Endpoint {
        Endpoint(
            path: "/api/reports/sales",
            queryItems: [URLQueryItem(name: "period", value: period)]
        )
    }

    static func topItems(period: String, limit: Int) -> Endpoint {
        Endpoint(
            path: "/api/reports/top-items",
            queryItems: [
                URLQueryItem(name: "period", value: period),
                URLQueryItem(name: "limit", value: String(limit)),
            ]
        )
    }

    static func employeePerformance(period: String) -> Endpoint {
        Endpoint(
            path: "/api/reports/employee-performance",
            queryItems: [URLQueryItem(name: "period", value: period)]
        )
    }

    static func hourly() -> Endpoint {
        Endpoint(path: "/api/reports/hourly")
    }

    static func cashCardBreakdown(period: String) -> Endpoint {
        Endpoint(
            path: "/api/reports/cash-card-breakdown",
            queryItems: [URLQueryItem(name: "period", value: period)]
        )
    }

    static func cogs(period: String) -> Endpoint {
        Endpoint(
            path: "/api/reports/cogs",
            queryItems: [URLQueryItem(name: "period", value: period)]
        )
    }

    static func categoryMargins(period: String) -> Endpoint {
        Endpoint(
            path: "/api/reports/category-margins",
            queryItems: [URLQueryItem(name: "period", value: period)]
        )
    }

    static func contributionMargin(period: String) -> Endpoint {
        Endpoint(
            path: "/api/reports/contribution-margin",
            queryItems: [URLQueryItem(name: "period", value: period)]
        )
    }

    static func live() -> Endpoint {
        Endpoint(path: "/api/reports/live")
    }

    static func deliveryMargins(period: String) -> Endpoint {
        Endpoint(
            path: "/api/reports/delivery-margins",
            queryItems: [URLQueryItem(name: "period", value: period)]
        )
    }

    static func channelComparison(period: String) -> Endpoint {
        Endpoint(
            path: "/api/reports/channel-comparison",
            queryItems: [URLQueryItem(name: "period", value: period)]
        )
    }
}

// MARK: - Modifier Endpoints

enum ModifierEndpoints {
    static func getGroups() -> Endpoint {
        Endpoint(path: "/api/modifiers/groups")
    }

    static func getGroupsForItem(menuItemId: Int) -> Endpoint {
        Endpoint(path: "/api/modifiers/groups/item/\(menuItemId)")
    }

    static func createGroup(data: CreateModifierGroupRequest) -> Endpoint {
        Endpoint(
            path: "/api/modifiers/groups",
            method: .post,
            body: data
        )
    }

    static func updateGroup(id: Int, data: UpdateModifierGroupRequest) -> Endpoint {
        Endpoint(
            path: "/api/modifiers/groups/\(id)",
            method: .put,
            body: data
        )
    }

    static func createModifier(data: CreateModifierRequest) -> Endpoint {
        Endpoint(
            path: "/api/modifiers",
            method: .post,
            body: data
        )
    }

    static func updateModifier(id: Int, data: UpdateModifierRequest) -> Endpoint {
        Endpoint(
            path: "/api/modifiers/\(id)",
            method: .put,
            body: data
        )
    }

    static func assignGroupToItem(menuItemId: Int, groupId: Int) -> Endpoint {
        Endpoint(
            path: "/api/modifiers/assign",
            method: .post,
            body: AssignModifierGroupRequest(menu_item_id: menuItemId, modifier_group_id: groupId)
        )
    }

    static func removeGroupFromItem(menuItemId: Int, groupId: Int) -> Endpoint {
        Endpoint(
            path: "/api/modifiers/unassign",
            method: .post,
            body: UnassignModifierGroupRequest(menu_item_id: menuItemId, modifier_group_id: groupId)
        )
    }
}

struct CreateModifierGroupRequest: Codable, Sendable {
    let name: String
    let selection_type: String
    let required: Bool?
    let min_selections: Int?
    let max_selections: Int?
}

struct UpdateModifierGroupRequest: Codable, Sendable {
    let name: String?
    let selection_type: String?
    let required: Bool?
    let active: Bool?
}

struct CreateModifierRequest: Codable, Sendable {
    let group_id: Int
    let name: String
    let price_adjustment: Double
}

struct UpdateModifierRequest: Codable, Sendable {
    let name: String?
    let price_adjustment: Double?
    let active: Bool?
}

struct AssignModifierGroupRequest: Codable, Sendable {
    let menu_item_id: Int
    let modifier_group_id: Int
}

struct UnassignModifierGroupRequest: Codable, Sendable {
    let menu_item_id: Int
    let modifier_group_id: Int
}

// MARK: - Combo Endpoints

enum ComboEndpoints {
    static func getAll() -> Endpoint {
        Endpoint(path: "/api/combos")
    }

    static func create(data: CreateComboRequest) -> Endpoint {
        Endpoint(
            path: "/api/combos",
            method: .post,
            body: data
        )
    }

    static func update(id: Int, data: UpdateComboRequest) -> Endpoint {
        Endpoint(
            path: "/api/combos/\(id)",
            method: .put,
            body: data
        )
    }
}

// MARK: - Printer Endpoints

enum PrinterEndpoints {
    static func getAll() -> Endpoint {
        Endpoint(path: "/api/printers")
    }

    static func create(data: CreatePrinterRequest) -> Endpoint {
        Endpoint(
            path: "/api/printers",
            method: .post,
            body: data
        )
    }

    static func update(id: Int, data: UpdatePrinterRequest) -> Endpoint {
        Endpoint(
            path: "/api/printers/\(id)",
            method: .put,
            body: data
        )
    }

    static func getRoutes() -> Endpoint {
        Endpoint(path: "/api/printers/routes")
    }

    static func updateRoute(categoryId: Int, printerId: Int?) -> Endpoint {
        Endpoint(
            path: "/api/printers/routes",
            method: .put,
            body: UpdatePrinterRouteRequest(category_id: categoryId, printer_id: printerId)
        )
    }
}

struct CreatePrinterRequest: Codable, Sendable {
    let name: String
    let printer_type: String?
    let address: String
}

struct UpdatePrinterRequest: Codable, Sendable {
    let name: String?
    let printer_type: String?
    let address: String?
    let active: Bool?
}

struct UpdatePrinterRouteRequest: Codable, Sendable {
    let category_id: Int
    let printer_id: Int?
}

// MARK: - Delivery Endpoints

enum DeliveryEndpoints {
    static func getPlatforms() -> Endpoint {
        Endpoint(path: "/api/delivery/platforms")
    }

    static func updatePlatform(id: Int, data: UpdateDeliveryPlatformRequest) -> Endpoint {
        Endpoint(
            path: "/api/delivery/platforms/\(id)",
            method: .put,
            body: data
        )
    }

    static func getOrders(status: String?) -> Endpoint {
        var queryItems: [URLQueryItem]?
        if let status {
            queryItems = [URLQueryItem(name: "status", value: status)]
        }
        return Endpoint(
            path: "/api/delivery/orders",
            queryItems: queryItems
        )
    }

    static func updateOrderStatus(id: Int, status: String) -> Endpoint {
        Endpoint(
            path: "/api/delivery/orders/\(id)/status",
            method: .put,
            body: UpdateDeliveryOrderStatusRequest(status: status)
        )
    }
}

struct UpdateDeliveryPlatformRequest: Codable, Sendable {
    let display_name: String?
    let commission_percent: Double?
    let active: Bool?
}

struct UpdateDeliveryOrderStatusRequest: Codable, Sendable {
    let status: String
}

// MARK: - AI Endpoints

enum AIEndpoints {
    static func getCartSuggestions(itemIds: [Int], hour: Int?) -> Endpoint {
        var queryItems = [
            URLQueryItem(name: "items", value: itemIds.map(String.init).joined(separator: ","))
        ]
        if let hour {
            queryItems.append(URLQueryItem(name: "hour", value: String(hour)))
        }
        return Endpoint(
            path: "/api/ai/suggestions/cart",
            queryItems: queryItems
        )
    }

    static func getInventoryPushItems() -> Endpoint {
        Endpoint(path: "/api/ai/suggestions/inventory-push")
    }

    static func submitFeedback(feedback: AISuggestionFeedback) -> Endpoint {
        Endpoint(
            path: "/api/ai/suggestions/feedback",
            method: .post,
            body: feedback
        )
    }

    static func getConfig() -> Endpoint {
        Endpoint(path: "/api/ai/config")
    }

    static func updateConfig(data: UpdateAIConfigRequest) -> Endpoint {
        Endpoint(
            path: "/api/ai/config",
            method: .put,
            body: data
        )
    }

    static func getInsights() -> Endpoint {
        Endpoint(path: "/api/ai/insights")
    }

    static func getAnalytics(period: String?) -> Endpoint {
        var queryItems: [URLQueryItem]?
        if let period {
            queryItems = [URLQueryItem(name: "period", value: period)]
        }
        return Endpoint(
            path: "/api/ai/analytics",
            queryItems: queryItems
        )
    }

    static func getPricingSuggestions() -> Endpoint {
        Endpoint(path: "/api/ai/pricing-suggestions")
    }

    static func applyPricingSuggestion(id: String, menuItemId: Int, newPrice: Double) -> Endpoint {
        Endpoint(
            path: "/api/ai/pricing-suggestions/\(id)/apply",
            method: .post,
            body: ApplyPricingSuggestionRequest(menu_item_id: menuItemId, new_price: newPrice)
        )
    }

    static func getInventoryForecast() -> Endpoint {
        Endpoint(path: "/api/ai/inventory-forecast")
    }

    static func getCategoryRoles() -> Endpoint {
        Endpoint(path: "/api/ai/category-roles")
    }

    static func updateCategoryRole(categoryId: Int, role: String) -> Endpoint {
        Endpoint(
            path: "/api/ai/category-roles/\(categoryId)",
            method: .put,
            body: UpdateCategoryRoleRequest(role: role)
        )
    }

    static func exportConfig() -> Endpoint {
        Endpoint(path: "/api/ai/config/export")
    }

    static func importConfig(data: ImportAIConfigRequest) -> Endpoint {
        Endpoint(
            path: "/api/ai/config/import",
            method: .post,
            body: data
        )
    }
}

struct ApplyPricingSuggestionRequest: Codable, Sendable {
    let menu_item_id: Int
    let new_price: Double
}

struct UpdateCategoryRoleRequest: Codable, Sendable {
    let role: String
}

// MARK: - Loyalty Endpoints

enum LoyaltyEndpoints {
    static func lookupByPhone(_ phone: String) -> Endpoint {
        Endpoint(
            path: "/api/loyalty/customers/phone/\(phone)"
        )
    }

    static func register(request: RegisterCustomerRequest) -> Endpoint {
        Endpoint(
            path: "/api/loyalty/customers",
            method: .post,
            body: request
        )
    }

    static func addStamps(request: AddStampsRequest) -> Endpoint {
        Endpoint(
            path: "/api/loyalty/stamps",
            method: .post,
            body: request
        )
    }
}

// MARK: - Branding Endpoints

enum BrandingEndpoints {
    static func get() -> Endpoint {
        Endpoint(path: "/api/branding")
    }
}
