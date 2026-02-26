import Foundation

struct MenuCategory: Codable, Identifiable, Sendable {
    let id: Int
    var name: String
    var sort_order: Int
    var active: Bool

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(Int.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
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

struct MenuItem: Codable, Identifiable, Sendable {
    let id: Int
    var category_id: Int
    var name: String
    var price: Double
    var description: String?
    var image_url: String?
    var active: Bool

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(Int.self, forKey: .id)
        category_id = try container.decode(Int.self, forKey: .category_id)
        name = try container.decode(String.self, forKey: .name)
        price = try container.flexibleDouble(forKey: .price)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        image_url = try container.decodeIfPresent(String.self, forKey: .image_url)

        if let boolVal = try? container.decode(Bool.self, forKey: .active) {
            active = boolVal
        } else if let intVal = try? container.decode(Int.self, forKey: .active) {
            active = intVal != 0
        } else {
            active = true
        }
    }
}
