import SwiftUI

enum AppColors {
    // Backgrounds
    static let background = Color(hex: 0x0A0A0A)    // neutral-950
    static let card = Color(hex: 0x171717)            // neutral-900
    static let cardHover = Color(hex: 0x1C1C1C)
    static let surface = Color(hex: 0x262626)         // neutral-800

    // Borders
    static let border = Color(hex: 0x262626)          // neutral-800
    static let borderLight = Color(hex: 0x404040)     // neutral-700

    // Accent — dynamically overridable via branding
    nonisolated(unsafe) static var accent = Color(hex: 0xDC2626)          // red-600
    nonisolated(unsafe) static var accentDark = Color(hex: 0xB91C1C)      // red-700
    nonisolated(unsafe) static var accentLight = Color(hex: 0xEF4444)     // red-500

    // Text
    static let textPrimary = Color.white
    static let textSecondary = Color(hex: 0xA3A3A3)   // neutral-400
    static let textTertiary = Color(hex: 0x737373)    // neutral-500
    static let textMuted = Color(hex: 0x525252)       // neutral-600

    // Status
    static let success = Color(hex: 0x16A34A)         // green-600
    static let successLight = Color(hex: 0x4ADE80)    // green-400
    static let warning = Color(hex: 0xF59E0B)         // amber-500
    static let warningLight = Color(hex: 0xFBBF24)    // amber-400
    static let error = Color(hex: 0xDC2626)           // red-600
    static let info = Color(hex: 0x2563EB)            // blue-600

    // Role badges
    static let roleAdmin = Color(hex: 0xDC2626)       // red
    static let roleManager = Color(hex: 0x9333EA)     // purple
    static let roleKitchen = Color(hex: 0x2563EB)     // blue
    static let roleCashier = Color(hex: 0x16A34A)     // green

    // MARK: - Dynamic Branding

    /// Replace the accent color from a hex string (e.g. "#0d9488").
    static func applyBranding(hex: String) {
        guard let rgb = parseHexString(hex) else { return }
        accent = Color(.sRGB, red: rgb.r, green: rgb.g, blue: rgb.b, opacity: 1)
        // Derive darker / lighter shades
        accentDark = Color(.sRGB, red: rgb.r * 0.8, green: rgb.g * 0.8, blue: rgb.b * 0.8, opacity: 1)
        accentLight = Color(.sRGB, red: min(rgb.r * 1.2, 1), green: min(rgb.g * 1.2, 1), blue: min(rgb.b * 1.2, 1), opacity: 1)
    }

    private static func parseHexString(_ hex: String) -> (r: Double, g: Double, b: Double)? {
        var cleaned = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if cleaned.hasPrefix("#") { cleaned.removeFirst() }
        guard cleaned.count == 6, let value = UInt(cleaned, radix: 16) else { return nil }
        return (
            r: Double((value >> 16) & 0xFF) / 255,
            g: Double((value >> 8) & 0xFF) / 255,
            b: Double(value & 0xFF) / 255
        )
    }
}

extension Color {
    init(hex: UInt, opacity: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: opacity
        )
    }
}
