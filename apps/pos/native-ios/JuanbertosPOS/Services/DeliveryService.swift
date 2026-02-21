import Foundation

enum DeliveryService {
    static func getPlatforms() async throws -> [DeliveryPlatform] {
        try await APIClient.shared.request(DeliveryEndpoints.getPlatforms())
    }

    static func updatePlatform(id: Int, displayName: String? = nil, commissionPercent: Double? = nil, active: Bool? = nil) async throws {
        let request = UpdateDeliveryPlatformRequest(
            display_name: displayName,
            commission_percent: commissionPercent,
            active: active
        )
        try await APIClient.shared.requestVoid(DeliveryEndpoints.updatePlatform(id: id, data: request))
    }

    static func getOrders(status: String? = nil) async throws -> [DeliveryOrder] {
        try await APIClient.shared.request(DeliveryEndpoints.getOrders(status: status))
    }

    static func updateOrderStatus(id: Int, status: String) async throws {
        try await APIClient.shared.requestVoid(DeliveryEndpoints.updateOrderStatus(id: id, status: status))
    }
}
