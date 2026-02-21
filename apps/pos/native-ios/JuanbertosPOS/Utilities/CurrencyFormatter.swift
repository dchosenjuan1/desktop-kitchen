import Foundation

enum CurrencyFormatter {
    static let taxRate: Double = 0.16
    static let taxLabel = "IVA (16%)"

    private static let formatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "MXN"
        f.currencySymbol = "$"
        f.minimumFractionDigits = 2
        f.maximumFractionDigits = 2
        return f
    }()

    static func format(_ amount: Double) -> String {
        formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }

    static func formatShort(_ amount: Double) -> String {
        String(format: "$%.2f", amount)
    }

    static func calculateTax(subtotal: Double) -> Double {
        (subtotal * taxRate * 100).rounded() / 100
    }
}
