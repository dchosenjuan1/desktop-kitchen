import Foundation

enum AIEndpoints {
    static func getCartSuggestions(itemIds: [Int], hour: Int? = nil) -> Endpoint {
        var queryItems = [URLQueryItem(name: "items", value: itemIds.map(String.init).joined(separator: ","))]
        if let hour {
            queryItems.append(URLQueryItem(name: "hour", value: String(hour)))
        }
        return Endpoint(path: "/ai/suggestions/cart", queryItems: queryItems)
    }

    static func getInventoryPushItems() -> Endpoint {
        Endpoint(path: "/ai/suggestions/inventory-push")
    }

    static func submitFeedback(feedback: AISuggestionFeedback) -> Endpoint {
        Endpoint(path: "/ai/suggestions/feedback", method: .post, body: feedback)
    }

    static func getConfig() -> Endpoint {
        Endpoint(path: "/ai/config")
    }

    static func updateConfig(data: UpdateAIConfigRequest) -> Endpoint {
        Endpoint(path: "/ai/config", method: .put, body: data)
    }

    static func getInsights() -> Endpoint {
        Endpoint(path: "/ai/insights")
    }

    static func getAnalytics(period: String? = nil) -> Endpoint {
        var queryItems: [URLQueryItem]? = nil
        if let period {
            queryItems = [URLQueryItem(name: "period", value: period)]
        }
        return Endpoint(path: "/ai/analytics", queryItems: queryItems)
    }

    static func getPricingSuggestions() -> Endpoint {
        Endpoint(path: "/ai/pricing-suggestions")
    }

    static func applyPricingSuggestion(id: String, menuItemId: Int, newPrice: Double) -> Endpoint {
        struct Body: Encodable { let menu_item_id: Int; let new_price: Double }
        return Endpoint(
            path: "/ai/pricing-suggestions/\(id)/apply",
            method: .post,
            body: Body(menu_item_id: menuItemId, new_price: newPrice)
        )
    }

    static func getInventoryForecast() -> Endpoint {
        Endpoint(path: "/ai/inventory-forecast")
    }

    static func getCategoryRoles() -> Endpoint {
        Endpoint(path: "/ai/category-roles")
    }

    static func updateCategoryRole(categoryId: Int, role: String) -> Endpoint {
        struct Body: Encodable { let role: String }
        return Endpoint(
            path: "/ai/category-roles/\(categoryId)",
            method: .put,
            body: Body(role: role)
        )
    }

    static func exportConfig() -> Endpoint {
        Endpoint(path: "/ai/config/export")
    }

    static func importConfig(data: ImportAIConfigRequest) -> Endpoint {
        Endpoint(path: "/ai/config/import", method: .post, body: data)
    }
}

struct UpdateAIConfigRequest: Codable, Sendable {
    var key: String?
    var value: String?
    var description: String?
    var entries: [AIConfigBulkEntry]?
}

struct AIConfigBulkEntry: Codable, Sendable {
    var key: String
    var value: String
    var description: String?
}

struct ImportAIConfigRequest: Codable, Sendable {
    var config: [String: AIConfigEntry]
}
