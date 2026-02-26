import Foundation

@Observable
final class ServerConfig: @unchecked Sendable {
    static let shared = ServerConfig()

    private let baseURLKey = "server_base_url"
    private let tenantKey = "tenant_id"
    private let defaultURL = "http://192.168.100.32:3001"
    private let defaultTenant = "demo"

    var baseURL: String {
        didSet { UserDefaults.standard.set(baseURL, forKey: baseURLKey) }
    }

    var tenantID: String {
        didSet { UserDefaults.standard.set(tenantID, forKey: tenantKey) }
    }

    private init() {
        self.baseURL = UserDefaults.standard.string(forKey: baseURLKey) ?? defaultURL
        self.tenantID = UserDefaults.standard.string(forKey: tenantKey) ?? defaultTenant
    }

    func reset() {
        baseURL = defaultURL
        tenantID = defaultTenant
    }
}
