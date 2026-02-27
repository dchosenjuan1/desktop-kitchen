import Foundation

enum LoyaltyService {
    static func lookupByPhone(_ phone: String) async throws -> LoyaltyCustomer {
        try await APIClient.shared.request(LoyaltyEndpoints.lookupByPhone(phone))
    }

    static func register(phone: String, name: String?, smsOptIn: Bool, referralCode: String? = nil) async throws -> LoyaltyCustomer {
        let request = RegisterCustomerRequest(phone: phone, name: name, sms_opt_in: smsOptIn, referral_code: referralCode)
        return try await APIClient.shared.request(LoyaltyEndpoints.register(request: request))
    }

    static func addStamps(customerId: Int, orderId: Int) async throws -> StampResult {
        let request = AddStampsRequest(customer_id: customerId, order_id: orderId)
        return try await APIClient.shared.request(LoyaltyEndpoints.addStamps(request: request))
    }
}
