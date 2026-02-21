import Foundation

enum DeliveryEndpoints {
    static func getPlatforms() -> Endpoint {
        Endpoint(path: "/delivery/platforms")
    }

    static func updatePlatform(id: Int, data: UpdateDeliveryPlatformRequest) -> Endpoint {
        Endpoint(path: "/delivery/platforms/\(id)", method: .put, body: data)
    }

    static func getOrders(status: String? = nil) -> Endpoint {
        var queryItems: [URLQueryItem]? = nil
        if let status {
            queryItems = [URLQueryItem(name: "status", value: status)]
        }
        return Endpoint(path: "/delivery/orders", queryItems: queryItems)
    }

    static func updateOrderStatus(id: Int, status: String) -> Endpoint {
        struct Body: Encodable { let status: String }
        return Endpoint(
            path: "/delivery/orders/\(id)/status",
            method: .put,
            body: Body(status: status)
        )
    }
}

struct UpdateDeliveryPlatformRequest: Codable, Sendable {
    var display_name: String?
    var commission_percent: Double?
    var active: Bool?
}
