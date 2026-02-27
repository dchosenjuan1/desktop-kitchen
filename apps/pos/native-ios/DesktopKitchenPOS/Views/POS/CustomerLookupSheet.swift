import SwiftUI

struct CustomerLookupSheet: View {
    let onCustomerLinked: (LoyaltyCustomer) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var phone = ""
    @State private var isSearching = false
    @State private var foundCustomer: LoyaltyCustomer?
    @State private var showRegisterForm = false
    @State private var notFound = false
    @State private var error: String?

    // Register form
    @State private var registerName = ""
    @State private var smsOptIn = true
    @State private var referralCode = ""
    @State private var isRegistering = false

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()

                VStack(spacing: 20) {
                    if let customer = foundCustomer {
                        customerFoundView(customer)
                    } else if showRegisterForm {
                        registerFormView
                    } else {
                        phoneEntryView
                    }
                }
                .padding(.horizontal, 20)
            }
            .navigationTitle("Customer Lookup")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(AppColors.textSecondary)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: - Phone Entry

    private var phoneEntryView: some View {
        VStack(spacing: 20) {
            Image(systemName: "person.crop.circle.badge.questionmark")
                .font(.system(size: 48))
                .foregroundStyle(AppColors.textMuted)
                .padding(.top, 20)

            Text("Enter phone number")
                .font(AppFonts.headline)
                .foregroundStyle(.white)

            // Phone input
            HStack(spacing: 0) {
                Text("+52 ")
                    .font(AppFonts.title3)
                    .foregroundStyle(AppColors.textTertiary)
                TextField("10 digit number", text: $phone)
                    .keyboardType(.numberPad)
                    .font(AppFonts.title3)
                    .foregroundStyle(.white)
            }
            .padding(14)
            .background(AppColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            // Numpad
            numpad

            if let error {
                Text(error)
                    .font(AppFonts.caption)
                    .foregroundStyle(AppColors.error)
            }

            if notFound {
                Text("Customer not found")
                    .font(AppFonts.subheadline)
                    .foregroundStyle(AppColors.warning)

                Button {
                    showRegisterForm = true
                    notFound = false
                } label: {
                    Label("Register New Customer", systemImage: "person.badge.plus")
                }
                .buttonStyle(SecondaryButtonStyle())
            }

            Spacer()

            Button {
                Task { await searchCustomer() }
            } label: {
                if isSearching {
                    ProgressView().tint(.white)
                } else {
                    Label("Search", systemImage: "magnifyingglass")
                }
            }
            .buttonStyle(PrimaryButtonStyle(isDisabled: phone.count < 10 || isSearching))
            .disabled(phone.count < 10 || isSearching)
            .padding(.bottom, 20)
        }
    }

    // MARK: - Numpad

    private var numpad: some View {
        let keys: [[String]] = [
            ["1", "2", "3"],
            ["4", "5", "6"],
            ["7", "8", "9"],
            ["", "0", "⌫"],
        ]

        return VStack(spacing: 8) {
            ForEach(keys, id: \.self) { row in
                HStack(spacing: 8) {
                    ForEach(row, id: \.self) { key in
                        if key.isEmpty {
                            Color.clear.frame(width: 70, height: 50)
                        } else {
                            Button {
                                handleNumpadKey(key)
                            } label: {
                                Text(key)
                                    .font(AppFonts.title3)
                                    .foregroundStyle(.white)
                                    .frame(width: 70, height: 50)
                                    .background(AppColors.surface)
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                        }
                    }
                }
            }
        }
    }

    private func handleNumpadKey(_ key: String) {
        if key == "⌫" {
            if !phone.isEmpty { phone.removeLast() }
        } else if phone.count < 10 {
            phone += key
        }
    }

    // MARK: - Customer Found

    private func customerFoundView(_ customer: LoyaltyCustomer) -> some View {
        VStack(spacing: 20) {
            Image(systemName: "person.crop.circle.fill.badge.checkmark")
                .font(.system(size: 48))
                .foregroundStyle(AppColors.success)
                .padding(.top, 20)

            VStack(spacing: 4) {
                Text(customer.name ?? "Customer")
                    .font(AppFonts.title3)
                    .foregroundStyle(.white)
                Text(customer.phone)
                    .font(AppFonts.subheadline)
                    .foregroundStyle(AppColors.textSecondary)
            }

            // Stats
            HStack(spacing: 24) {
                statBubble(value: "\(customer.orders_count)", label: "Orders")
                statBubble(value: CurrencyFormatter.formatShort(customer.total_spent), label: "Spent")
            }

            // Stamp progress
            if let card = customer.activeCard {
                stampProgress(card: card)
            }

            Spacer()

            Button {
                onCustomerLinked(customer)
                dismiss()
            } label: {
                Label("Link Customer", systemImage: "link")
            }
            .buttonStyle(PrimaryButtonStyle())
            .padding(.bottom, 20)
        }
    }

    private func statBubble(value: String, label: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(AppFonts.headline)
                .foregroundStyle(.white)
            Text(label)
                .font(AppFonts.caption)
                .foregroundStyle(AppColors.textTertiary)
        }
        .frame(width: 80)
        .padding(.vertical, 12)
        .background(AppColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func stampProgress(card: StampCard) -> some View {
        VStack(spacing: 8) {
            Text("Stamp Card")
                .font(AppFonts.subheadline)
                .foregroundStyle(AppColors.textSecondary)

            HStack(spacing: 6) {
                ForEach(0..<card.stamps_required, id: \.self) { i in
                    Circle()
                        .fill(i < card.stamps_earned ? AppColors.accent : AppColors.surface)
                        .frame(width: 24, height: 24)
                        .overlay(
                            Circle().stroke(AppColors.borderLight, lineWidth: 1)
                        )
                }
            }

            Text("\(card.stamps_earned)/\(card.stamps_required)")
                .font(AppFonts.caption)
                .foregroundStyle(AppColors.textTertiary)

            if let reward = card.reward_description {
                Text(reward)
                    .font(AppFonts.caption)
                    .foregroundStyle(AppColors.warning)
            }
        }
        .padding(14)
        .cardStyle()
    }

    // MARK: - Register Form

    private var registerFormView: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.badge.plus")
                .font(.system(size: 40))
                .foregroundStyle(AppColors.accent)
                .padding(.top, 20)

            Text("New Customer")
                .font(AppFonts.title3)
                .foregroundStyle(.white)

            Text("+52 \(phone)")
                .font(AppFonts.subheadline)
                .foregroundStyle(AppColors.textSecondary)

            VStack(alignment: .leading, spacing: 8) {
                Text("Name (optional)")
                    .font(AppFonts.subheadline)
                    .foregroundStyle(AppColors.textSecondary)
                TextField("Customer name", text: $registerName)
                    .font(AppFonts.body)
                    .foregroundStyle(.white)
                    .padding(12)
                    .background(AppColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }

            Toggle(isOn: $smsOptIn) {
                Text("SMS notifications")
                    .font(AppFonts.subheadline)
                    .foregroundStyle(.white)
            }
            .tint(AppColors.accent)

            VStack(alignment: .leading, spacing: 8) {
                Text("Referral code (optional)")
                    .font(AppFonts.subheadline)
                    .foregroundStyle(AppColors.textSecondary)
                TextField("Code", text: $referralCode)
                    .font(AppFonts.body)
                    .foregroundStyle(.white)
                    .padding(12)
                    .background(AppColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.characters)
            }

            if let error {
                Text(error)
                    .font(AppFonts.caption)
                    .foregroundStyle(AppColors.error)
            }

            Spacer()

            Button {
                Task { await registerCustomer() }
            } label: {
                if isRegistering {
                    ProgressView().tint(.white)
                } else {
                    Label("Register & Link", systemImage: "checkmark.circle.fill")
                }
            }
            .buttonStyle(PrimaryButtonStyle(isDisabled: isRegistering))
            .disabled(isRegistering)
            .padding(.bottom, 20)
        }
    }

    // MARK: - API

    private func searchCustomer() async {
        isSearching = true
        error = nil
        notFound = false
        do {
            let customer = try await LoyaltyService.lookupByPhone(phone)
            foundCustomer = customer
        } catch let apiError as APIError {
            if case .httpError(let code, _) = apiError, code == 404 {
                notFound = true
            } else {
                error = apiError.localizedDescription
            }
        } catch {
            self.error = error.localizedDescription
        }
        isSearching = false
    }

    private func registerCustomer() async {
        isRegistering = true
        error = nil
        do {
            let customer = try await LoyaltyService.register(
                phone: phone,
                name: registerName.isEmpty ? nil : registerName,
                smsOptIn: smsOptIn,
                referralCode: referralCode.isEmpty ? nil : referralCode
            )
            onCustomerLinked(customer)
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
        isRegistering = false
    }
}
