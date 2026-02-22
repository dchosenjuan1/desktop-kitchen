import Foundation

enum EmployeeService {
    static func getAll() async throws -> [Employee] {
        try await APIClient.shared.request(EmployeeEndpoints.getAll())
    }

    static func create(name: String, pin: String, role: String) async throws -> Employee {
        try await APIClient.shared.request(EmployeeEndpoints.create(name: name, pin: pin, role: role))
    }

    static func update(id: Int, name: String?, pin: String?, role: String?) async throws {
        try await APIClient.shared.requestVoid(EmployeeEndpoints.update(id: id, name: name, pin: pin, role: role))
    }

    static func toggle(id: Int) async throws {
        try await APIClient.shared.requestVoid(EmployeeEndpoints.toggle(id: id))
    }
}
