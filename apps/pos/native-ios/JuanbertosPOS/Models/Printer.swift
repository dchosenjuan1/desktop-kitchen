import Foundation

struct Printer: Codable, Identifiable, Sendable {
    let id: Int
    var name: String
    var printer_type: String
    var address: String
    var active: Bool

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(Int.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        printer_type = try container.decode(String.self, forKey: .printer_type)
        address = try container.decode(String.self, forKey: .address)

        if let boolVal = try? container.decode(Bool.self, forKey: .active) {
            active = boolVal
        } else if let intVal = try? container.decode(Int.self, forKey: .active) {
            active = intVal != 0
        } else {
            active = true
        }
    }
}
