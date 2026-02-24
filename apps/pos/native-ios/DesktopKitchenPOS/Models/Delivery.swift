import Foundation

struct DeliveryPlatform: Codable, Identifiable, Sendable {
    let id: Int
    var name: String
    var display_name: String
    var commission_percent: Double
    var active: Bool

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(Int.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        display_name = try container.decode(String.self, forKey: .display_name)
        commission_percent = try container.decodeIfPresent(Double.self, forKey: .commission_percent) ?? 0

        if let boolVal = try? container.decode(Bool.self, forKey: .active) {
            active = boolVal
        } else if let intVal = try? container.decode(Int.self, forKey: .active) {
            active = intVal != 0
        } else {
            active = true
        }
    }
}

struct DeliveryOrder: Codable, Identifiable, Sendable {
    let id: Int
    var order_id: Int
    var platform_id: Int
    var external_order_id: String
    var platform_status: String
    var delivery_fee: Double
    var platform_commission: Double
    var customer_name: String
    var delivery_address: String
}
