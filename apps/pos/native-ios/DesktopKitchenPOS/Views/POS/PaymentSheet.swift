import SwiftUI

struct PaymentSheet: View {
    let vm: POSViewModel
    let employeeId: Int
    var showSplitButton: Bool = true
    @Environment(\.dismiss) private var dismiss

    @State private var selectedTip: TipOption = .none

    enum TipOption: Hashable {
        case none, ten, fifteen, twenty, custom
    }

    @State private var customTipPercent = ""

    private var tipPercent: Double {
        switch selectedTip {
        case .none: return 0
        case .ten: return 10
        case .fifteen: return 15
        case .twenty: return 20
        case .custom: return Double(customTipPercent) ?? 0
        }
    }

    private var tip: Double {
        vm.total * tipPercent / 100
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()

                VStack(spacing: 20) {
                    // Total display
                    VStack(spacing: 4) {
                        Text("Total")
                            .font(AppFonts.subheadline)
                            .foregroundStyle(AppColors.textSecondary)
                        Text(CurrencyFormatter.format(vm.total + tip))
                            .font(AppFonts.price)
                            .foregroundStyle(.white)
                        if tip > 0 {
                            Text("Tip \(Int(tipPercent))% — \(CurrencyFormatter.format(tip))")
                                .font(AppFonts.caption)
                                .foregroundStyle(AppColors.accentLight)
                        }
                    }
                    .padding(.top, 16)

                    // Tip presets (percentage)
                    HStack(spacing: 8) {
                        tipPill("None", option: .none)
                        tipPill("10%", option: .ten)
                        tipPill("15%", option: .fifteen)
                        tipPill("20%", option: .twenty)
                        tipPill("Custom", option: .custom)
                    }
                    .padding(.horizontal, 20)

                    if selectedTip == .custom {
                        HStack(spacing: 8) {
                            TextField("Tip %", text: $customTipPercent)
                                .keyboardType(.decimalPad)
                                .font(AppFonts.title3)
                                .foregroundStyle(.white)
                                .padding(12)
                                .background(AppColors.surface)
                                .clipShape(RoundedRectangle(cornerRadius: 10))

                            Text("%")
                                .font(AppFonts.title3)
                                .foregroundStyle(AppColors.textSecondary)
                        }
                        .padding(.horizontal, 20)
                    }

                    Spacer()

                    // Big payment buttons
                    VStack(spacing: 12) {
                        Button {
                            Task {
                                await vm.processCashPayment(employeeId: employeeId, tip: tip)
                                if !vm.isProcessingPayment { dismiss() }
                            }
                        } label: {
                            if vm.isProcessingPayment {
                                ProgressView().tint(.white)
                            } else {
                                VStack(spacing: 4) {
                                    Image(systemName: "banknote.fill")
                                        .font(.system(size: 28))
                                    Text("Cash")
                                        .font(.system(size: 18, weight: .bold))
                                }
                            }
                        }
                        .buttonStyle(PaymentMethodButtonStyle(color: AppColors.success))
                        .disabled(vm.isProcessingPayment)

                        Button {
                            Task {
                                await vm.processCardPayment(employeeId: employeeId, tip: tip)
                                if !vm.isProcessingPayment { dismiss() }
                            }
                        } label: {
                            if vm.isProcessingPayment {
                                ProgressView().tint(.white)
                            } else {
                                VStack(spacing: 4) {
                                    Image(systemName: "creditcard.fill")
                                        .font(.system(size: 28))
                                    Text("Card")
                                        .font(.system(size: 18, weight: .bold))
                                }
                            }
                        }
                        .buttonStyle(PaymentMethodButtonStyle(color: AppColors.info))
                        .disabled(vm.isProcessingPayment)

                        // Split button (hidden in kiosk mode)
                        if showSplitButton {
                            Button {
                                Task {
                                    await vm.startSplitPayment(employeeId: employeeId)
                                    dismiss()
                                }
                            } label: {
                                Label("Split Payment", systemImage: "divide")
                            }
                            .buttonStyle(SecondaryButtonStyle())
                            .disabled(vm.isProcessingPayment)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Payment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(AppColors.textSecondary)
                }
            }
        }
        .presentationDetents([.fraction(0.55)])
    }

    private func tipPill(_ label: String, option: TipOption) -> some View {
        Button { selectedTip = option } label: {
            Text(label)
        }
        .buttonStyle(TipPillStyle(isSelected: selectedTip == option))
    }
}
