import Foundation

struct ModifierGroup: Codable, Identifiable, Sendable {
    let id: Int
    var name: String
    var selection_type: SelectionType
    var required: Bool
    var min_selections: Int
    var max_selections: Int
    var sort_order: Int
    var active: Bool
    var modifiers: [Modifier]?

    enum SelectionType: String, Codable, Sendable {
        case single
        case multi
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(Int.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        selection_type = try container.decode(SelectionType.self, forKey: .selection_type)
        min_selections = try container.decodeIfPresent(Int.self, forKey: .min_selections) ?? 0
        max_selections = try container.decodeIfPresent(Int.self, forKey: .max_selections) ?? 0
        sort_order = try container.decodeIfPresent(Int.self, forKey: .sort_order) ?? 0
        modifiers = try container.decodeIfPresent([Modifier].self, forKey: .modifiers)

        if let boolVal = try? container.decode(Bool.self, forKey: .required) {
            required = boolVal
        } else if let intVal = try? container.decode(Int.self, forKey: .required) {
            required = intVal != 0
        } else {
            required = false
        }

        if let boolVal = try? container.decode(Bool.self, forKey: .active) {
            active = boolVal
        } else if let intVal = try? container.decode(Int.self, forKey: .active) {
            active = intVal != 0
        } else {
            active = true
        }
    }
}

struct Modifier: Codable, Identifiable, Sendable {
    let id: Int
    var group_id: Int
    var name: String
    var price_adjustment: Double
    var sort_order: Int
    var active: Bool

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(Int.self, forKey: .id)
        group_id = try container.decode(Int.self, forKey: .group_id)
        name = try container.decode(String.self, forKey: .name)
        price_adjustment = try container.decodeIfPresent(Double.self, forKey: .price_adjustment) ?? 0
        sort_order = try container.decodeIfPresent(Int.self, forKey: .sort_order) ?? 0

        if let boolVal = try? container.decode(Bool.self, forKey: .active) {
            active = boolVal
        } else if let intVal = try? container.decode(Int.self, forKey: .active) {
            active = intVal != 0
        } else {
            active = true
        }
    }
}

struct OrderItemModifier: Codable, Identifiable, Sendable {
    let id: Int
    var order_item_id: Int
    var modifier_id: Int
    var modifier_name: String
    var price_adjustment: Double
}
