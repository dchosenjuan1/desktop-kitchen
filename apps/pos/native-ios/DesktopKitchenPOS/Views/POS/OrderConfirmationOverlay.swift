import SwiftUI

struct OrderConfirmationOverlay: View {
    let orderNumber: String
    let onDismiss: () -> Void

    @State private var scale: CGFloat = 0.5
    @State private var opacity: Double = 0

    var body: some View {
        ZStack {
            Color.black.opacity(0.75)
                .ignoresSafeArea()
                .onTapGesture { onDismiss() }

            VStack(spacing: 24) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(AppColors.success)
                    .symbolEffect(.bounce, value: scale)

                Text("Order Confirmed")
                    .font(AppFonts.title2)
                    .foregroundStyle(.white)

                Text("#\(orderNumber)")
                    .font(AppFonts.orderNumber)
                    .foregroundStyle(.white)

                Text("Tap to dismiss")
                    .font(AppFonts.caption)
                    .foregroundStyle(AppColors.textTertiary)
                    .padding(.top, 8)
            }
            .scaleEffect(scale)
            .opacity(opacity)
        }
        .onAppear {
            withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                scale = 1.0
                opacity = 1.0
            }
            Task { @MainActor in
                try? await Task.sleep(for: .seconds(3))
                onDismiss()
            }
        }
    }
}
