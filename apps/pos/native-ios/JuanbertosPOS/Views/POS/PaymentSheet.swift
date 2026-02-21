import SwiftUI

struct PaymentSheet: View {
    let orderTotal: Double
    let isProcessing: Bool
    let onPaymentComplete: (Double, PaymentMethod) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var tip: Double = 0
    @State private var showCustomTip = false
    @State private var customTipText = ""

    private var finalTotal: Double { orderTotal + tip }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 8) {
                    Text("Payment")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(.white)
                    Text("Subtotal: \(CurrencyFormatter.formatShort(orderTotal))")
                        .font(.system(size: 22))
                        .foregroundStyle(.white)
                }
                .frame(maxWidth: .infinity)
                .padding(24)
                .background(AppColors.accent)

                ScrollView {
                    VStack(spacing: 24) {
                        // Tip selection
                        tipSelectionView

                        // Custom tip
                        customTipView

                        // Total display
                        totalDisplayView

                        // Payment buttons
                        paymentButtonsView
                    }
                    .padding(24)
                }
            }
            .background(AppColors.card)
        }
        .presentationDetents([.large])
        .interactiveDismissDisabled(isProcessing)
    }

    // MARK: - Tip Selection

    private var tipSelectionView: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Select Tip:")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(.white)

            HStack(spacing: 8) {
                tipButton("No Tip", amount: 0)
                tipButton("15%", amount: tipAmount(15))
                tipButton("18%", amount: tipAmount(18))
                tipButton("20%", amount: tipAmount(20))
            }
        }
    }

    private func tipButton(_ label: String, amount: Double) -> some View {
        Button {
            tip = amount
            showCustomTip = false
        } label: {
            Text(label)
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(tip == amount && !showCustomTip ? .white : AppColors.textSecondary)
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .background(tip == amount && !showCustomTip ? AppColors.accent : AppColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }

    private func tipAmount(_ percentage: Double) -> Double {
        (orderTotal * percentage / 100 * 100).rounded() / 100
    }

    // MARK: - Custom Tip

    private var customTipView: some View {
        Group {
            if showCustomTip {
                HStack(spacing: 8) {
                    TextField("$0.00", text: $customTipText)
                        .keyboardType(.decimalPad)
                        .font(.system(size: 18))
                        .foregroundStyle(.white)
                        .padding(12)
                        .background(AppColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(AppColors.borderLight, lineWidth: 1)
                        )

                    Button("OK") {
                        tip = Double(customTipText) ?? 0
                        showCustomTip = false
                    }
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .frame(height: 48)
                    .background(AppColors.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            } else {
                Button {
                    showCustomTip = true
                } label: {
                    Text("Custom Tip")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(AppColors.textSecondary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                        .background(AppColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
    }

    // MARK: - Total Display

    private var totalDisplayView: some View {
        VStack(spacing: 8) {
            Text("Tip Amount: \(CurrencyFormatter.formatShort(tip))")
                .font(.system(size: 14))
                .foregroundStyle(AppColors.textSecondary)
            Text("Total: \(CurrencyFormatter.formatShort(finalTotal))")
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(AppColors.accentLight)
        }
        .frame(maxWidth: .infinity)
        .padding(16)
        .background(AppColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Payment Buttons

    private var paymentButtonsView: some View {
        VStack(spacing: 12) {
            Button {
                onPaymentComplete(tip, .card)
            } label: {
                Text(isProcessing ? "Processing..." : "Pay with Card")
            }
            .buttonStyle(PrimaryButtonStyle(isDisabled: isProcessing))
            .disabled(isProcessing)

            Button {
                onPaymentComplete(tip, .cash)
            } label: {
                Text("Cash Payment")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(AppColors.borderLight)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(isProcessing)

            Button("Cancel") { dismiss() }
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(AppColors.textSecondary)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .disabled(isProcessing)
        }
    }
}
