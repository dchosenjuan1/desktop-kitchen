import Foundation

struct LoyaltyCustomer: Codable, Identifiable, Sendable {
    let id: Int
    var phone: String
    var name: String?
    var referral_code: String?
    var stamps_earned: Int
    var orders_count: Int
    var total_spent: Double
    var last_visit: String?
    var sms_opt_in: Bool
    var activeCard: StampCard?

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(Int.self, forKey: .id)
        phone = try container.decode(String.self, forKey: .phone)
        name = try container.decodeIfPresent(String.self, forKey: .name)
        referral_code = try container.decodeIfPresent(String.self, forKey: .referral_code)
        stamps_earned = try container.decodeIfPresent(Int.self, forKey: .stamps_earned) ?? 0
        orders_count = try container.decodeIfPresent(Int.self, forKey: .orders_count) ?? 0
        total_spent = try container.decodeIfPresent(Double.self, forKey: .total_spent) ?? 0
        last_visit = try container.decodeIfPresent(String.self, forKey: .last_visit)
        activeCard = try container.decodeIfPresent(StampCard.self, forKey: .activeCard)

        if let boolVal = try? container.decode(Bool.self, forKey: .sms_opt_in) {
            sms_opt_in = boolVal
        } else if let intVal = try? container.decode(Int.self, forKey: .sms_opt_in) {
            sms_opt_in = intVal != 0
        } else {
            sms_opt_in = false
        }
    }
}

struct StampCard: Codable, Identifiable, Sendable {
    let id: Int
    var stamps_earned: Int
    var stamps_required: Int
    var reward_description: String?
    var completed: Bool
    var redeemed: Bool

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(Int.self, forKey: .id)
        stamps_earned = try container.decodeIfPresent(Int.self, forKey: .stamps_earned) ?? 0
        stamps_required = try container.decodeIfPresent(Int.self, forKey: .stamps_required) ?? 10

        reward_description = try container.decodeIfPresent(String.self, forKey: .reward_description)

        if let boolVal = try? container.decode(Bool.self, forKey: .completed) {
            completed = boolVal
        } else if let intVal = try? container.decode(Int.self, forKey: .completed) {
            completed = intVal != 0
        } else {
            completed = false
        }

        if let boolVal = try? container.decode(Bool.self, forKey: .redeemed) {
            redeemed = boolVal
        } else if let intVal = try? container.decode(Int.self, forKey: .redeemed) {
            redeemed = intVal != 0
        } else {
            redeemed = false
        }
    }
}

struct StampResult: Codable, Sendable {
    let stamps_earned: Int
    let stamps_required: Int
    let card_completed: Bool
    let reward_description: String?
}

struct RegisterCustomerRequest: Codable, Sendable {
    let phone: String
    let name: String?
    let sms_opt_in: Bool
    let referral_code: String?
}

struct AddStampsRequest: Codable, Sendable {
    let customer_id: Int
    let order_id: Int
}
