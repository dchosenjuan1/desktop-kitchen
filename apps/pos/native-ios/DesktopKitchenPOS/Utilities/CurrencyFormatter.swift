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

    /// Extract IVA from a tax-inclusive total (Mexican pricing: displayed prices include IVA).
    static func extractTax(fromTotal total: Double) -> Double {
        (total - total / (1 + taxRate)).rounded(toPlaces: 2)
    }

    /// Extract the pre-tax subtotal from a tax-inclusive total.
    static func extractSubtotal(fromTotal total: Double) -> Double {
        (total / (1 + taxRate)).rounded(toPlaces: 2)
    }
}

private extension Double {
    func rounded(toPlaces places: Int) -> Double {
        let multiplier = pow(10, Double(places))
        return (self * multiplier).rounded() / multiplier
    }
}
