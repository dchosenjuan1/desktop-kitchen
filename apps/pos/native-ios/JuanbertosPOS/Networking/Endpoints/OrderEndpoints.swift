import Foundation

enum OrderEndpoints {
    static func getOrders(status: String? = nil, date: String? = nil) -> Endpoint {
        var queryItems: [URLQueryItem] = []
        if let status { queryItems.append(URLQueryItem(name: "status", value: status)) }
        if let date { queryItems.append(URLQueryItem(name: "date", value: date)) }
        return Endpoint(
            path: "/orders",
            queryItems: queryItems.isEmpty ? nil : queryItems
        )
    }

    static func getOrder(id: Int) -> Endpoint {
        Endpoint(path: "/orders/\(id)")
    }

    static func createOrder(request: CreateOrderRequest) -> Endpoint {
        Endpoint(path: "/orders", method: .post, body: request)
    }

    static func updateStatus(id: Int, status: String) -> Endpoint {
        struct Body: Encodable { let status: String }
        return Endpoint(
            path: "/orders/\(id)/status",
            method: .put,
            body: Body(status: status)
        )
    }

    static func getKitchenOrders() -> Endpoint {
        Endpoint(path: "/orders/kitchen/active")
    }
}
