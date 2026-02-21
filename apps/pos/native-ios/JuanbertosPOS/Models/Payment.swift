import Foundation

struct PaymentIntent: Codable, Sendable {
    let client_secret: String
    let payment_intent_id: String
    let amount: Double
}

struct PaymentStatus: Codable, Sendable {
    let status: PaymentStatusType
    let payment_intent_id: String?
    let amount: Double?
}

struct CreatePaymentIntentRequest: Codable, Sendable {
    let order_id: Int
    let tip: Double?
}

struct ConfirmPaymentRequest: Codable, Sendable {
    let order_id: Int
    let payment_intent_id: String
}

struct CashPaymentRequest: Codable, Sendable {
    let order_id: Int
    let tip: Double?
    let amount_received: Double?
}

struct RefundPaymentRequest: Codable, Sendable {
    let order_id: Int
    let amount: Double?
}

struct SplitPaymentSplit: Codable, Sendable {
    let payment_method: PaymentMethod
    let amount: Double
    let tip: Double?
    let item_ids: [Int]?
}

struct SplitPaymentRequest: Codable, Sendable {
    let order_id: Int
    let split_type: String // "even" | "by_item" | "by_amount"
    let splits: [SplitPaymentSplit]
}

struct OrderPayment: Codable, Identifiable, Sendable {
    let id: Int
    var order_id: Int
    var payment_method: PaymentMethod
    var amount: Double
    var tip: Double
    var payment_intent_id: String?
    var status: String
}
