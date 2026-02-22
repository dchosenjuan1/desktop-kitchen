import Foundation

struct InventoryItem: Codable, Identifiable, Sendable {
    let id: Int
    var name: String
    var quantity: Double
    var unit: String
    var low_stock_threshold: Double
    var category: String

    var stockStatus: StockStatus {
        if quantity <= 0 { return .outOfStock }
        if quantity <= low_stock_threshold { return .lowStock }
        return .inStock
    }
}

enum StockStatus: Sendable {
    case inStock
    case lowStock
    case outOfStock

    var label: String {
        switch self {
        case .inStock: return "In Stock"
        case .lowStock: return "Low Stock"
        case .outOfStock: return "Out of Stock"
        }
    }
}
