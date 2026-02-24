import Foundation

enum PrinterService {
    static func getAll() async throws -> [Printer] {
        try await APIClient.shared.request(PrinterEndpoints.getAll())
    }

    static func create(name: String, printerType: String? = nil, address: String) async throws -> Printer {
        let request = CreatePrinterRequest(name: name, printer_type: printerType, address: address)
        return try await APIClient.shared.request(PrinterEndpoints.create(data: request))
    }

    static func update(id: Int, name: String? = nil, printerType: String? = nil, address: String? = nil, active: Bool? = nil) async throws {
        let request = UpdatePrinterRequest(name: name, printer_type: printerType, address: address, active: active)
        try await APIClient.shared.requestVoid(PrinterEndpoints.update(id: id, data: request))
    }

    static func getRoutes() async throws -> [CategoryPrinterRoute] {
        try await APIClient.shared.request(PrinterEndpoints.getRoutes())
    }

    static func updateRoute(categoryId: Int, printerId: Int?) async throws {
        try await APIClient.shared.requestVoid(PrinterEndpoints.updateRoute(categoryId: categoryId, printerId: printerId))
    }
}

struct CategoryPrinterRoute: Codable, Sendable {
    var category_id: Int?
    var category_name: String?
    var printer_id: Int?
    var printer_name: String?
}
