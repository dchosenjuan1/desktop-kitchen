import Foundation

enum OrderService {
    static func getOrders(status: String? = nil) async throws -> [Order] {
        try await APIClient.shared.request(OrderEndpoints.getOrders(status: status))
    }

    static func getOrder(id: Int) async throws -> Order {
        try await APIClient.shared.request(OrderEndpoints.getOrder(id: id))
    }

    static func createOrder(employeeId: Int, items: [CreateOrderItem]) async throws -> Order {
        let request = CreateOrderRequest(employee_id: employeeId, items: items)
        return try await APIClient.shared.request(OrderEndpoints.createOrder(request: request))
    }

    static func updateStatus(id: Int, status: String) async throws {
        try await APIClient.shared.requestVoid(OrderEndpoints.updateStatus(id: id, status: status))
    }

    static func getKitchenOrders() async throws -> [Order] {
        try await APIClient.shared.request(OrderEndpoints.getKitchenOrders())
    }
}
