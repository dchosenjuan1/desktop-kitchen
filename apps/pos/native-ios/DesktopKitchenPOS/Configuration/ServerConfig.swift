import Foundation

@Observable
final class ServerConfig: @unchecked Sendable {
    static let shared = ServerConfig()

    private let baseURLKey = "server_base_url"
    private let tenantKey = "tenant_id"
    private let adminSecretKey = "admin_secret"
    private let defaultURL = "https://pos.desktop.kitchen"
    private let defaultTenant = "juanbertos"

    var baseURL: String {
        didSet { UserDefaults.standard.set(baseURL, forKey: baseURLKey) }
    }

    var tenantID: String {
        didSet { UserDefaults.standard.set(tenantID, forKey: tenantKey) }
    }

    /// Required in production to authorize X-Tenant-ID header.
    var adminSecret: String {
        didSet { UserDefaults.standard.set(adminSecret, forKey: adminSecretKey) }
    }

    private init() {
        self.baseURL = UserDefaults.standard.string(forKey: baseURLKey) ?? defaultURL
        self.tenantID = UserDefaults.standard.string(forKey: tenantKey) ?? defaultTenant
        self.adminSecret = UserDefaults.standard.string(forKey: adminSecretKey) ?? ""
    }

    func reset() {
        baseURL = defaultURL
        tenantID = defaultTenant
        adminSecret = ""
    }
}
