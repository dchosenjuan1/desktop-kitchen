import Foundation

struct ComboDefinition: Codable, Identifiable, Sendable {
    let id: Int
    var name: String
    var description: String
    var combo_price: Double
    var active: Bool
    var slots: [ComboSlot]?

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(Int.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        description = try container.decodeIfPresent(String.self, forKey: .description) ?? ""
        combo_price = try container.flexibleDouble(forKey: .combo_price)
        slots = try container.decodeIfPresent([ComboSlot].self, forKey: .slots)

        if let boolVal = try? container.decode(Bool.self, forKey: .active) {
            active = boolVal
        } else if let intVal = try? container.decode(Int.self, forKey: .active) {
            active = intVal != 0
        } else {
            active = true
        }
    }
}

struct ComboSlot: Codable, Identifiable, Sendable {
    let id: Int
    var combo_id: Int
    var slot_label: String
    var category_id: Int?
    var specific_item_id: Int?
    var sort_order: Int
}

struct CreateComboSlotRequest: Codable, Sendable {
    var slot_label: String
    var category_id: Int?
    var specific_item_id: Int?
    var sort_order: Int?
}

struct CreateComboRequest: Codable, Sendable {
    var name: String
    var description: String?
    var combo_price: Double
    var slots: [CreateComboSlotRequest]?
}

struct UpdateComboRequest: Codable, Sendable {
    var name: String?
    var description: String?
    var combo_price: Double?
    var active: Bool?
    var slots: [CreateComboSlotRequest]?
}
