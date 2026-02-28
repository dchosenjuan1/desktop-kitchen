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
        didSet {
            let cleaned = Self.stripAPIPath(baseURL)
            if cleaned != baseURL { baseURL = cleaned; return }
            UserDefaults.standard.set(baseURL, forKey: baseURLKey)
        }
    }

    var tenantID: String {
        didSet { UserDefaults.standard.set(tenantID, forKey: tenantKey) }
    }

    /// Required in production to authorize X-Tenant-ID header.
    var adminSecret: String {
        didSet { UserDefaults.standard.set(adminSecret, forKey: adminSecretKey) }
    }

    private init() {
        let savedURL = UserDefaults.standard.string(forKey: baseURLKey) ?? defaultURL
        self.baseURL = Self.stripAPIPath(savedURL)
        self.tenantID = UserDefaults.standard.string(forKey: tenantKey) ?? defaultTenant
        self.adminSecret = UserDefaults.standard.string(forKey: adminSecretKey) ?? ""
    }

    /// Remove trailing `/api` or `/api/` so the app can prepend it consistently.
    private static func stripAPIPath(_ url: String) -> String {
        var u = url
        if u.hasSuffix("/") { u = String(u.dropLast()) }
        if u.hasSuffix("/api") { u = String(u.dropLast(4)) }
        return u
    }

    func reset() {
        baseURL = defaultURL
        tenantID = defaultTenant
        adminSecret = ""
    }
}
