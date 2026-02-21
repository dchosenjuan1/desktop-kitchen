import Foundation

enum EmployeeEndpoints {
    static func getAll() -> Endpoint {
        Endpoint(path: "/employees")
    }

    static func create(name: String, pin: String, role: String) -> Endpoint {
        struct Body: Encodable {
            let name: String
            let pin: String
            let role: String
        }
        return Endpoint(
            path: "/employees",
            method: .post,
            body: Body(name: name, pin: pin, role: role)
        )
    }

    static func update(id: Int, name: String?, pin: String?, role: String?) -> Endpoint {
        struct Body: Encodable {
            let name: String?
            let pin: String?
            let role: String?
        }
        return Endpoint(
            path: "/employees/\(id)",
            method: .put,
            body: Body(name: name, pin: pin, role: role)
        )
    }

    static func toggle(id: Int) -> Endpoint {
        Endpoint(path: "/employees/\(id)/toggle", method: .put)
    }
}
