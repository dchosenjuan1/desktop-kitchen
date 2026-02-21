import Foundation

struct AISuggestion: Codable, Sendable {
    var type: String
    var priority: Int
    var data: AISuggestionData
}

struct AISuggestionData: Codable, Sendable {
    var rule: String
    var suggested_item_id: Int
    var suggested_item_name: String
    var suggested_item_price: Double
    var savings: Double?
    var message: String
}

struct InventoryPushItem: Codable, Identifiable, Sendable {
    var id: Int { menu_item_id }
    var menu_item_id: Int
    var name: String
    var price: Double
    var category_id: Int
    var category_name: String
    var reason: String
    var ingredient_name: String?
}

struct InventoryPushData: Codable, Sendable {
    var pushItems: [InventoryPushItem]
    var avoidItems: [InventoryPushItem]
    var lowIngredients: [LowIngredient]?
}

struct LowIngredient: Codable, Sendable {
    var id: Int
    var name: String
    var quantity: Double
    var unit: String
    var low_stock_threshold: Double
}

struct AISuggestionFeedback: Codable, Sendable {
    var suggestion_type: String
    var suggestion_data: AnyCodable?
    var action: String // "accepted" | "dismissed"
    var employee_id: Int?
    var order_id: Int?
}

struct AIConfigEntry: Codable, Sendable {
    var value: String
    var description: String?
    var updated_at: String?
}

struct AIInsights: Codable, Sendable {
    var inventory: AIInsightsInventory
    var suggestions: AIInsightsSuggestions
    var topItemPairs: [ItemPair]
    var recentSnapshots: [RecentSnapshot]
    var claudeStats: ClaudeStats
    var aiStatus: AIStatus
}

struct AIInsightsInventory: Codable, Sendable {
    var pushItems: Int
    var avoidItems: Int
    var lowIngredients: Int
}

struct AIInsightsSuggestions: Codable, Sendable {
    var totalEvents: Int
    var accepted: Int
    var acceptanceRate: Double
}

struct ItemPair: Codable, Sendable {
    var item_a_id: Int
    var item_b_id: Int
    var pair_count: Int
    var item_a_name: String
    var item_b_name: String
}

struct RecentSnapshot: Codable, Sendable {
    var snapshot_hour: String
    var order_count: Int
    var revenue: Double
    var avg_ticket: Double
}

struct ClaudeStats: Codable, Sendable {
    var enabled: Bool
    var apiKeySet: Bool
    var callsThisHour: Int
    var maxCallsPerHour: Int
    var model: String
}

struct AIStatus: Codable, Sendable {
    var initialized: Bool
    var scheduler: AIScheduler
}

struct AIScheduler: Codable, Sendable {
    var running: Bool
    var jobs: [AIJob]
}

struct AIJob: Codable, Sendable {
    var name: String
    var intervalMs: Int
    var lastRun: String?
    var runCount: Int
}

struct AIAnalytics: Codable, Sendable {
    var period: String
    var byType: [AIAnalyticsByType]
    var dailyTrend: [AIAnalyticsDailyTrend]
    var aiRevenue: AIRevenue
}

struct AIAnalyticsByType: Codable, Sendable {
    var suggestion_type: String
    var action: String
    var count: Int
}

struct AIAnalyticsDailyTrend: Codable, Sendable {
    var date: String
    var action: String
    var count: Int
}

struct AIRevenue: Codable, Sendable {
    var itemsSold: Int
    var revenue: Double
}

struct PricingSuggestion: Codable, Identifiable, Sendable {
    var id: String
    var type: String // "markup" | "discount"
    var menu_item_id: Int
    var item_name: String
    var current_price: Double
    var suggested_price: Double
    var change_percent: Double
    var reason: String
    var requires_approval: Bool
}

struct InventoryForecast: Codable, Identifiable, Sendable {
    var id: Int { inventory_item_id }
    var inventory_item_id: Int
    var name: String
    var current_quantity: Double
    var unit: String
    var category: String
    var avg_daily_usage: Double
    var days_until_stockout: Double?
    var days_until_low: Double?
    var suggested_reorder_qty: Double?
    var risk_level: String // "critical" | "high" | "medium" | "low" | "unknown"
    var data_days: Int
    var message: String?
}

struct CategoryRole: Codable, Identifiable, Sendable {
    var id: Int
    var category_id: Int
    var role: String
    var category_name: String
}

// Type-erased Codable for dynamic JSON (used in feedback suggestion_data)
struct AnyCodable: Codable, @unchecked Sendable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let intVal = try? container.decode(Int.self) {
            value = intVal
        } else if let doubleVal = try? container.decode(Double.self) {
            value = doubleVal
        } else if let stringVal = try? container.decode(String.self) {
            value = stringVal
        } else if let boolVal = try? container.decode(Bool.self) {
            value = boolVal
        } else if let arrayVal = try? container.decode([AnyCodable].self) {
            value = arrayVal.map(\.value)
        } else if let dictVal = try? container.decode([String: AnyCodable].self) {
            value = dictVal.mapValues(\.value)
        } else {
            value = NSNull()
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case let intVal as Int: try container.encode(intVal)
        case let doubleVal as Double: try container.encode(doubleVal)
        case let stringVal as String: try container.encode(stringVal)
        case let boolVal as Bool: try container.encode(boolVal)
        case is NSNull: try container.encodeNil()
        default: try container.encodeNil()
        }
    }
}
