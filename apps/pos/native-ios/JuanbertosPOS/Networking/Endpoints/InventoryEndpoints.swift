import Foundation

enum InventoryEndpoints {
    static func getAll() -> Endpoint {
        Endpoint(path: "/inventory")
    }

    static func getLowStock() -> Endpoint {
        Endpoint(path: "/inventory/low-stock")
    }

    static func update(id: Int, quantity: Double? = nil, threshold: Double? = nil) -> Endpoint {
        struct Body: Encodable {
            let quantity: Double?
            let low_stock_threshold: Double?
        }
        return Endpoint(
            path: "/inventory/\(id)",
            method: .put,
            body: Body(quantity: quantity, low_stock_threshold: threshold)
        )
    }

    static func restock(id: Int, quantity: Double) -> Endpoint {
        struct Body: Encodable { let quantity: Double }
        return Endpoint(
            path: "/inventory/\(id)/restock",
            method: .post,
            body: Body(quantity: quantity)
        )
    }
}
