import Foundation

enum AIService {
    static func getCartSuggestions(itemIds: [Int], hour: Int? = nil) async throws -> [AISuggestion] {
        try await APIClient.shared.request(AIEndpoints.getCartSuggestions(itemIds: itemIds, hour: hour))
    }

    static func getInventoryPushItems() async throws -> InventoryPushData {
        try await APIClient.shared.request(AIEndpoints.getInventoryPushItems())
    }

    static func submitFeedback(_ feedback: AISuggestionFeedback) async throws {
        try await APIClient.shared.requestVoid(AIEndpoints.submitFeedback(feedback: feedback))
    }

    static func getConfig() async throws -> [String: AIConfigEntry] {
        try await APIClient.shared.request(AIEndpoints.getConfig())
    }

    static func updateConfig(key: String, value: String, description: String? = nil) async throws {
        let request = UpdateAIConfigRequest(key: key, value: value, description: description)
        try await APIClient.shared.requestVoid(AIEndpoints.updateConfig(data: request))
    }

    static func updateConfigBulk(entries: [AIConfigBulkEntry]) async throws {
        let request = UpdateAIConfigRequest(entries: entries)
        try await APIClient.shared.requestVoid(AIEndpoints.updateConfig(data: request))
    }

    static func getInsights() async throws -> AIInsights {
        try await APIClient.shared.request(AIEndpoints.getInsights())
    }

    static func getAnalytics(period: String? = nil) async throws -> AIAnalytics {
        try await APIClient.shared.request(AIEndpoints.getAnalytics(period: period))
    }

    static func getPricingSuggestions() async throws -> [PricingSuggestion] {
        try await APIClient.shared.request(AIEndpoints.getPricingSuggestions())
    }

    static func applyPricingSuggestion(id: String, menuItemId: Int, newPrice: Double) async throws {
        try await APIClient.shared.requestVoid(AIEndpoints.applyPricingSuggestion(id: id, menuItemId: menuItemId, newPrice: newPrice))
    }

    static func getInventoryForecast() async throws -> [InventoryForecast] {
        try await APIClient.shared.request(AIEndpoints.getInventoryForecast())
    }

    static func getCategoryRoles() async throws -> [CategoryRole] {
        try await APIClient.shared.request(AIEndpoints.getCategoryRoles())
    }

    static func updateCategoryRole(categoryId: Int, role: String) async throws {
        try await APIClient.shared.requestVoid(AIEndpoints.updateCategoryRole(categoryId: categoryId, role: role))
    }

    static func exportConfig() async throws -> [String: AIConfigEntry] {
        try await APIClient.shared.request(AIEndpoints.exportConfig())
    }

    static func importConfig(_ config: [String: AIConfigEntry]) async throws {
        let request = ImportAIConfigRequest(config: config)
        try await APIClient.shared.requestVoid(AIEndpoints.importConfig(data: request))
    }
}
