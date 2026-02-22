import Foundation

enum ComboService {
    static func getAll() async throws -> [ComboDefinition] {
        try await APIClient.shared.request(ComboEndpoints.getAll())
    }

    static func create(name: String, description: String? = nil, comboPrice: Double, slots: [CreateComboSlotRequest]? = nil) async throws -> ComboDefinition {
        let request = CreateComboRequest(name: name, description: description, combo_price: comboPrice, slots: slots)
        return try await APIClient.shared.request(ComboEndpoints.create(data: request))
    }

    static func update(id: Int, name: String? = nil, description: String? = nil, comboPrice: Double? = nil, active: Bool? = nil, slots: [CreateComboSlotRequest]? = nil) async throws {
        let request = UpdateComboRequest(name: name, description: description, combo_price: comboPrice, active: active, slots: slots)
        try await APIClient.shared.requestVoid(ComboEndpoints.update(id: id, data: request))
    }
}
