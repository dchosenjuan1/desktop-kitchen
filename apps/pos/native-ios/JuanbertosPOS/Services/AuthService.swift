import Foundation

enum AuthService {
    static func login(pin: String) async throws -> Employee {
        try await APIClient.shared.request(AuthEndpoints.login(pin: pin))
    }
}
