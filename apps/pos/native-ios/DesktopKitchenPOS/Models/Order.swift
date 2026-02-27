import Foundation

enum PaymentMethod: String, Codable, Sendable {
    case card
    case cash
    case split
}

enum OrderSource: String, Codable, Sendable {
    case pos
    case uber_eats
    case rappi
    case didi_food
}

struct Order: Codable, Identifiable, Sendable {
    let id: Int
    var order_number: String
    var employee_id: Int
    var employee_name: String?
    var status: OrderStatus
    var subtotal: Double
    var tax: Double
    var tip: Double
    var total: Double
    var payment_intent_id: String?
    var payment_status: PaymentStatusType
    var payment_method: PaymentMethod?
    var source: OrderSource?
    var created_at: String?
    var completed_at: String?
    var items: [OrderItem]?
}

enum OrderStatus: String, Codable, Sendable {
    case pending
    case confirmed
    case preparing
    case ready
    case completed
    case cancelled

    var displayName: String {
        rawValue.uppercased()
    }
}

enum PaymentStatusType: String, Codable, Sendable {
    case unpaid
    case processing
    case paid
    case completed
    case failed
    case refunded
}

struct OrderItem: Codable, Identifiable, Sendable {
    var id: Int?
    var order_id: Int?
    var menu_item_id: Int
    var item_name: String
    var quantity: Int
    var unit_price: Double
    var notes: String?
    var combo_instance_id: String?
    var modifiers: [OrderItemModifier]?
}

struct CartItem: Identifiable, Sendable {
    let cart_id: String
    var menu_item_id: Int
    var item_name: String
    var quantity: Int
    var unit_price: Double
    var notes: String?
    var combo_instance_id: String?
    var menuItem: MenuItem?
    var selectedModifierIds: [Int]?
    var selectedModifierNames: [String]?

    var id: String { cart_id }

    var lineTotal: Double {
        unit_price * Double(quantity)
    }

    func toCreateOrderItem() -> CreateOrderItem {
        CreateOrderItem(
            menu_item_id: menu_item_id,
            quantity: quantity,
            notes: notes,
            modifiers: selectedModifierIds,
            combo_instance_id: combo_instance_id
        )
    }
}

struct CreateOrderItem: Codable, Sendable {
    let menu_item_id: Int
    let quantity: Int
    let notes: String?
    let modifiers: [Int]?
    let combo_instance_id: String?
}

struct CreateOrderRequest: Codable, Sendable {
    let employee_id: Int
    let items: [CreateOrderItem]
}
