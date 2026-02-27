import SwiftUI

struct ShakeModifier: ViewModifier {
    var shake: Bool

    func body(content: Content) -> some View {
        content
            .offset(x: shake ? -6 : 0)
            .animation(
                shake
                    ? .default.repeatCount(3, autoreverses: true).speed(6)
                    : .default,
                value: shake
            )
    }
}
