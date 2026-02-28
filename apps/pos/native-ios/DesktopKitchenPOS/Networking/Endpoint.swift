import Foundation

struct Endpoint {
    let path: String
    let method: HTTPMethod
    let queryItems: [URLQueryItem]?
    let body: Encodable?

    init(
        path: String,
        method: HTTPMethod = .get,
        queryItems: [URLQueryItem]? = nil,
        body: Encodable? = nil
    ) {
        self.path = path
        self.method = method
        self.queryItems = queryItems
        self.body = body
    }

    func urlRequest(baseURL: String) throws -> URLRequest {
        guard var components = URLComponents(string: baseURL + "/api" + path) else {
            throw APIError.invalidURL
        }

        if let queryItems, !queryItems.isEmpty {
            components.queryItems = queryItems
        }

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(ServerConfig.shared.tenantID, forHTTPHeaderField: "X-Tenant-ID")

        let adminSecret = ServerConfig.shared.adminSecret
        if !adminSecret.isEmpty {
            request.setValue(adminSecret, forHTTPHeaderField: "X-Admin-Secret")
        }

        if let token = AuthTokenStore.shared.token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.httpBody = try JSONEncoder().encode(AnyEncodable(body))
        }

        return request
    }
}

/// Thread-safe store for the employee JWT token.
final class AuthTokenStore: @unchecked Sendable {
    static let shared = AuthTokenStore()
    private let lock = NSLock()
    private var _token: String?

    var token: String? {
        get { lock.withLock { _token } }
        set { lock.withLock { _token = newValue } }
    }
}

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case delete = "DELETE"
}

// Type-erased Encodable wrapper
private struct AnyEncodable: Encodable {
    private let _encode: (Encoder) throws -> Void

    init(_ wrapped: Encodable) {
        _encode = { encoder in
            try wrapped.encode(to: encoder)
        }
    }

    func encode(to encoder: Encoder) throws {
        try _encode(encoder)
    }
}
