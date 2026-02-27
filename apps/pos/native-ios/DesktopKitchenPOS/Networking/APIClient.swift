import Foundation

final class APIClient: @unchecked Sendable {
    static let shared = APIClient()

    private let session: URLSession
    private let decoder: FlexibleJSONDecoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        self.session = URLSession(configuration: config)

        self.decoder = FlexibleJSONDecoder()
    }

    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        let baseURL = ServerConfig.shared.baseURL
        let urlRequest = try endpoint.urlRequest(baseURL: baseURL)

        #if DEBUG
        print("[API] \(endpoint.method.rawValue) \(endpoint.path)")
        #endif

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: urlRequest)
        } catch {
            #if DEBUG
            print("[API] Network error: \(error)")
            #endif
            throw APIError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown
        }

        #if DEBUG
        print("[API] \(endpoint.path) → \(httpResponse.statusCode)")
        #endif

        guard (200...299).contains(httpResponse.statusCode) else {
            let message = extractErrorMessage(from: data) ?? HTTPURLResponse.localizedString(forStatusCode: httpResponse.statusCode)
            #if DEBUG
            print("[API] HTTP error: \(httpResponse.statusCode) \(message)")
            if let body = String(data: data, encoding: .utf8) {
                print("[API] Response body: \(body.prefix(500))")
            }
            #endif
            throw APIError.httpError(statusCode: httpResponse.statusCode, message: message)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            #if DEBUG
            print("[API] Decode error for \(T.self): \(error)")
            if let body = String(data: data, encoding: .utf8) {
                print("[API] Raw JSON: \(body.prefix(500))")
            }
            #endif
            throw APIError.decodingError(error)
        }
    }

    func requestVoid(_ endpoint: Endpoint) async throws {
        let baseURL = ServerConfig.shared.baseURL
        let urlRequest = try endpoint.urlRequest(baseURL: baseURL)

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: urlRequest)
        } catch {
            throw APIError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let message = extractErrorMessage(from: data) ?? HTTPURLResponse.localizedString(forStatusCode: httpResponse.statusCode)
            throw APIError.httpError(statusCode: httpResponse.statusCode, message: message)
        }
    }

    func testConnection() async -> Bool {
        let endpoint = Endpoint(path: "/api/menu/categories")
        do {
            let _: [MenuCategory] = try await request(endpoint)
            return true
        } catch {
            return false
        }
    }

    private func extractErrorMessage(from data: Data) -> String? {
        struct ErrorResponse: Decodable {
            var error: String?
            var message: String?
        }
        guard let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) else {
            return nil
        }
        return errorResponse.error ?? errorResponse.message
    }
}
