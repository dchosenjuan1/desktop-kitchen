import Foundation

enum ComboEndpoints {
    static func getAll() -> Endpoint {
        Endpoint(path: "/combos")
    }

    static func create(data: CreateComboRequest) -> Endpoint {
        Endpoint(path: "/combos", method: .post, body: data)
    }

    static func update(id: Int, data: UpdateComboRequest) -> Endpoint {
        Endpoint(path: "/combos/\(id)", method: .put, body: data)
    }
}

struct CreateComboRequest: Codable, Sendable {
    var name: String
    var description: String?
    var combo_price: Double
    var slots: [CreateComboSlotRequest]?
}

struct CreateComboSlotRequest: Codable, Sendable {
    var slot_label: String
    var category_id: Int?
    var specific_item_id: Int?
    var sort_order: Int?
}

struct UpdateComboRequest: Codable, Sendable {
    var name: String?
    var description: String?
    var combo_price: Double?
    var active: Bool?
    var slots: [CreateComboSlotRequest]?
}
