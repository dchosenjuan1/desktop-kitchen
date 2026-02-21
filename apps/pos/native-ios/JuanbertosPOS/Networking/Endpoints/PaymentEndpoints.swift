import Foundation

enum PaymentEndpoints {
    static func createIntent(request: CreatePaymentIntentRequest) -> Endpoint {
        Endpoint(path: "/payments/create-intent", method: .post, body: request)
    }

    static func confirm(request: ConfirmPaymentRequest) -> Endpoint {
        Endpoint(path: "/payments/confirm", method: .post, body: request)
    }

    static func getStatus(orderId: Int) -> Endpoint {
        Endpoint(path: "/payments/\(orderId)")
    }

    static func cashPayment(request: CashPaymentRequest) -> Endpoint {
        Endpoint(path: "/payments/cash", method: .post, body: request)
    }

    static func refund(request: RefundPaymentRequest) -> Endpoint {
        Endpoint(path: "/payments/refund", method: .post, body: request)
    }

    static func splitPayment(request: SplitPaymentRequest) -> Endpoint {
        Endpoint(path: "/payments/split", method: .post, body: request)
    }

    static func getOrderSplits(orderId: Int) -> Endpoint {
        Endpoint(path: "/payments/split/\(orderId)")
    }
}
