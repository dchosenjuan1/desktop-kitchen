import SwiftUI

struct SplitPaymentSheet: View {
    let total: Double
    let orderId: Int
    let onComplete: () -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var cashAmount = ""
    @State private var isProcessing = false
    @State private var error: String?

    private var cashValue: Double { Double(cashAmount) ?? 0 }
    private var cardAmount: Double { max(0, total - cashValue) }
    private var canProcess: Bool { cashValue > 0 && cashValue < total && !isProcessing }

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()

                VStack(spacing: 24) {
                    // Total display
                    VStack(spacing: 4) {
                        Text("Total to Split")
                            .font(AppFonts.subheadline)
                            .foregroundStyle(AppColors.textSecondary)
                        Text(CurrencyFormatter.format(total))
                            .font(AppFonts.price)
                            .foregroundStyle(.white)
                    }
                    .padding(.top, 20)

                    // 50/50 quick split
                    Button {
                        cashAmount = String(format: "%.2f", total / 2)
                    } label: {
                        Label("50 / 50 Split", systemImage: "divide")
                    }
                    .buttonStyle(SecondaryButtonStyle())
                    .padding(.horizontal, 20)

                    // Cash input
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Cash Amount")
                            .font(AppFonts.subheadline)
                            .foregroundStyle(AppColors.textSecondary)
                        TextField("$0.00", text: $cashAmount)
                            .keyboardType(.decimalPad)
                            .font(AppFonts.title3)
                            .foregroundStyle(.white)
                            .padding(12)
                            .background(AppColors.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .padding(.horizontal, 20)

                    // Card remainder
                    HStack {
                        HStack(spacing: 6) {
                            Image(systemName: "creditcard")
                                .foregroundStyle(AppColors.textTertiary)
                            Text("Card Amount")
                                .font(AppFonts.subheadline)
                                .foregroundStyle(AppColors.textSecondary)
                        }
                        Spacer()
                        Text(CurrencyFormatter.format(cardAmount))
                            .font(AppFonts.headline)
                            .foregroundStyle(.white)
                    }
                    .padding(.horizontal, 20)

                    if let error {
                        Text(error)
                            .font(AppFonts.caption)
                            .foregroundStyle(AppColors.error)
                            .padding(.horizontal, 20)
                    }

                    Spacer()

                    Button {
                        Task { await processSplit() }
                    } label: {
                        if isProcessing {
                            ProgressView().tint(.white)
                        } else {
                            Label("Process Split Payment", systemImage: "checkmark.circle.fill")
                        }
                    }
                    .buttonStyle(PrimaryButtonStyle(isDisabled: !canProcess))
                    .disabled(!canProcess)
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Split Payment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(AppColors.textSecondary)
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func processSplit() async {
        isProcessing = true
        error = nil
        do {
            let splits = [
                SplitPaymentSplit(payment_method: .cash, amount: cashValue, tip: nil, item_ids: nil),
                SplitPaymentSplit(payment_method: .card, amount: cardAmount, tip: nil, item_ids: nil),
            ]
            try await PaymentService.splitPayment(orderId: orderId, splitType: "by_amount", splits: splits)
            onComplete()
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
        isProcessing = false
    }
}
