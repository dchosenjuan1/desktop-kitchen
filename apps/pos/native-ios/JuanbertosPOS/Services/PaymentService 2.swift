import Foundation

enum PaymentService {
    static func createIntent(orderId: Int, tip: Double) async throws -> PaymentIntent {
        let request = CreatePaymentIntentRequest(order_id: orderId, tip: tip)
        return try await APIClient.shared.request(PaymentEndpoints.createIntent(request: request))
    }

    static func confirm(orderId: Int, paymentIntentId: String) async throws {
        let request = ConfirmPaymentRequest(order_id: orderId, payment_intent_id: paymentIntentId)
        try await APIClient.shared.requestVoid(PaymentEndpoints.confirm(request: request))
    }

    static func getStatus(orderId: Int) async throws -> PaymentStatus {
        try await APIClient.shared.request(PaymentEndpoints.getStatus(orderId: orderId))
    }

    static func cashPayment(orderId: Int, tip: Double? = nil, amountReceived: Double? = nil) async throws {
        let request = CashPaymentRequest(order_id: orderId, tip: tip, amount_received: amountReceived)
        try await APIClient.shared.requestVoid(PaymentEndpoints.cashPayment(request: request))
    }

    static func refund(orderId: Int, amount: Double? = nil) async throws {
        let request = RefundPaymentRequest(order_id: orderId, amount: amount)
        try await APIClient.shared.requestVoid(PaymentEndpoints.refund(request: request))
    }

    static func splitPayment(orderId: Int, splitType: String, splits: [SplitPaymentSplit]) async throws {
        let request = SplitPaymentRequest(order_id: orderId, split_type: splitType, splits: splits)
        try await APIClient.shared.requestVoid(PaymentEndpoints.splitPayment(request: request))
    }

    static func getOrderSplits(orderId: Int) async throws -> [OrderPayment] {
        try await APIClient.shared.request(PaymentEndpoints.getOrderSplits(orderId: orderId))
    }
}
