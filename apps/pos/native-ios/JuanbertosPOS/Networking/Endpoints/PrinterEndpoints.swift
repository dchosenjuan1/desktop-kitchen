import Foundation

enum PrinterEndpoints {
    static func getAll() -> Endpoint {
        Endpoint(path: "/printers")
    }

    static func create(data: CreatePrinterRequest) -> Endpoint {
        Endpoint(path: "/printers", method: .post, body: data)
    }

    static func update(id: Int, data: UpdatePrinterRequest) -> Endpoint {
        Endpoint(path: "/printers/\(id)", method: .put, body: data)
    }

    static func getRoutes() -> Endpoint {
        Endpoint(path: "/printers/routes")
    }

    static func updateRoute(categoryId: Int, printerId: Int?) -> Endpoint {
        struct Body: Encodable { let category_id: Int; let printer_id: Int? }
        return Endpoint(
            path: "/printers/routes",
            method: .put,
            body: Body(category_id: categoryId, printer_id: printerId)
        )
    }
}

struct CreatePrinterRequest: Codable, Sendable {
    var name: String
    var printer_type: String?
    var address: String
}

struct UpdatePrinterRequest: Codable, Sendable {
    var name: String?
    var printer_type: String?
    var address: String?
    var active: Bool?
}
