import Foundation

enum BrandingService {
    static func getBranding() async throws -> TenantBranding {
        try await APIClient.shared.request(BrandingEndpoints.get())
    }
}
