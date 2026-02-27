import Foundation

struct TenantBranding: Codable, Sendable {
    let primaryColor: String?
    let logoUrl: String?
    let restaurantName: String?

    // API returns camelCase keys — no CodingKeys needed since Swift properties match
}
