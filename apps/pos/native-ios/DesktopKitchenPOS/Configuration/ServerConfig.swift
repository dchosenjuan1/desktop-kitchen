import Foundation

@Observable
final class ServerConfig: @unchecked Sendable {
    static let shared = ServerConfig()

    private let key = "server_base_url"
    private let defaultURL = "http://192.168.1.100:3001/api"

    var baseURL: String {
        didSet { UserDefaults.standard.set(baseURL, forKey: key) }
    }

    private init() {
        self.baseURL = UserDefaults.standard.string(forKey: key) ?? defaultURL
    }

    func reset() {
        baseURL = defaultURL
    }
}
