import Foundation

enum InventoryService {
    static func getAll() async throws -> [InventoryItem] {
        try await APIClient.shared.request(InventoryEndpoints.getAll())
    }

    static func getLowStock() async throws -> [InventoryItem] {
        try await APIClient.shared.request(InventoryEndpoints.getLowStock())
    }

    static func restock(id: Int, quantity: Double) async throws {
        try await APIClient.shared.requestVoid(InventoryEndpoints.restock(id: id, quantity: quantity))
    }

    static func updateThreshold(id: Int, threshold: Double) async throws {
        try await APIClient.shared.requestVoid(InventoryEndpoints.update(id: id, threshold: threshold))
    }
}
