import Foundation

struct Employee: Codable, Identifiable, Sendable {
    let id: Int
    var name: String
    var pin: String?
    var role: EmployeeRole
    var active: Bool
    var created_at: String

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(Int.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        pin = try container.decodeIfPresent(String.self, forKey: .pin)
        role = try container.decode(EmployeeRole.self, forKey: .role)
        created_at = try container.decodeIfPresent(String.self, forKey: .created_at) ?? ""

        // Backend returns Int from GET, Bool from POST
        if let boolVal = try? container.decode(Bool.self, forKey: .active) {
            active = boolVal
        } else if let intVal = try? container.decode(Int.self, forKey: .active) {
            active = intVal != 0
        } else {
            active = true
        }
    }
}

enum EmployeeRole: String, Codable, CaseIterable, Sendable {
    case cashier
    case kitchen
    case manager
    case admin

    var displayName: String {
        rawValue.capitalized
    }
}
