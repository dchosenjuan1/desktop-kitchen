import SwiftUI

enum AppFonts {
    static let largeTitle = Font.system(size: 34, weight: .black)
    static let title = Font.system(size: 28, weight: .bold)
    static let title2 = Font.system(size: 22, weight: .bold)
    static let title3 = Font.system(size: 20, weight: .semibold)
    static let headline = Font.system(size: 17, weight: .semibold)
    static let body = Font.system(size: 17, weight: .regular)
    static let callout = Font.system(size: 16, weight: .regular)
    static let subheadline = Font.system(size: 15, weight: .regular)
    static let footnote = Font.system(size: 13, weight: .regular)
    static let caption = Font.system(size: 12, weight: .regular)

    static let orderNumber = Font.system(size: 48, weight: .black).monospacedDigit()
    static let price = Font.system(size: 28, weight: .bold).monospacedDigit()
    static let pinDigit = Font.system(size: 28, weight: .bold).monospacedDigit()
}
