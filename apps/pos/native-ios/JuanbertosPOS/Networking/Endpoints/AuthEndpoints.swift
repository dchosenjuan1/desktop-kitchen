import Foundation

enum AuthEndpoints {
    static func login(pin: String) -> Endpoint {
        struct LoginBody: Encodable {
            let pin: String
        }
        return Endpoint(
            path: "/employees/login",
            method: .post,
            body: LoginBody(pin: pin)
        )
    }
}
