import SwiftUI

struct CartSidebar: View {
    let cart: [CartItem]
    let subtotal: Double
    let tax: Double
    let total: Double
    let onUpdateQuantity: (String, Int) -> Void
    let onRemove: (String) -> Void
    let onNotesTap: (CartItem) -> Void
    let onCharge: () -> Void
    let onClear: () -> Void
    let onLogout: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Cart header
            VStack(alignment: .leading, spacing: 4) {
                Text("Current Order")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(.white)
                Text(Date(), style: .time)
                    .font(.system(size: 14))
                    .foregroundStyle(Color(hex: 0xFCA5A5)) // red-200
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(AppColors.accent)

            // Cart items
            if cart.isEmpty {
                emptyCart
            } else {
                cartItemsList
            }

            // Totals
            totalsView

            // Action buttons
            actionButtons
        }
        .background(AppColors.card)
        .overlay(alignment: .leading) {
            Rectangle().fill(AppColors.border).frame(width: 1)
        }
    }

    // MARK: - Empty Cart

    private var emptyCart: some View {
        VStack(spacing: 8) {
            Spacer()
            Text("No items in cart")
                .font(.system(size: 18))
                .foregroundStyle(AppColors.textTertiary)
            Text("Select items from the menu")
                .font(.system(size: 14))
                .foregroundStyle(AppColors.textMuted)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Cart Items

    private var cartItemsList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(cart) { item in
                    CartItemRow(
                        item: item,
                        onIncrement: { onUpdateQuantity(item.cart_id, item.quantity + 1) },
                        onDecrement: { onUpdateQuantity(item.cart_id, item.quantity - 1) },
                        onRemove: { onRemove(item.cart_id) },
                        onNotesTap: { onNotesTap(item) }
                    )
                }
            }
            .padding(16)
        }
    }

    // MARK: - Totals

    private var totalsView: some View {
        VStack(spacing: 8) {
            HStack {
                Text("Subtotal:")
                    .foregroundStyle(AppColors.textSecondary)
                Spacer()
                Text(CurrencyFormatter.formatShort(subtotal))
                    .fontWeight(.bold)
                    .foregroundStyle(AppColors.textSecondary)
            }
            HStack {
                Text(CurrencyFormatter.taxLabel + ":")
                    .foregroundStyle(AppColors.textSecondary)
                Spacer()
                Text(CurrencyFormatter.formatShort(tax))
                    .fontWeight(.bold)
                    .foregroundStyle(AppColors.textSecondary)
            }

            Divider().background(AppColors.borderLight)

            HStack {
                Text("Total:")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(.white)
                Spacer()
                Text(CurrencyFormatter.formatShort(total))
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(AppColors.accentLight)
            }
        }
        .padding(16)
        .overlay(alignment: .top) {
            Rectangle().fill(AppColors.border).frame(height: 1)
        }
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        VStack(spacing: 12) {
            Button(action: onCharge) {
                Text("Charge \(CurrencyFormatter.formatShort(total))")
            }
            .buttonStyle(PrimaryButtonStyle(isDisabled: cart.isEmpty))
            .disabled(cart.isEmpty)

            Button(action: onClear) {
                Text("Clear Order")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(cart.isEmpty ? AppColors.borderLight : AppColors.accentLight)
            }
            .disabled(cart.isEmpty)
            .frame(height: 44)

            Button(action: onLogout) {
                Text("Logout")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(AppColors.textSecondary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 36)
                    .background(AppColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(AppColors.borderLight, lineWidth: 1)
                    )
            }
        }
        .padding(16)
        .overlay(alignment: .top) {
            Rectangle().fill(AppColors.border).frame(height: 1)
        }
    }
}

// MARK: - Cart Item Row

struct CartItemRow: View {
    let item: CartItem
    let onIncrement: () -> Void
    let onDecrement: () -> Void
    let onRemove: () -> Void
    let onNotesTap: () -> Void

    var body: some View {
        VStack(spacing: 8) {
            // Name + remove
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.item_name)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)

                    if let modifierNames = item.selectedModifierNames, !modifierNames.isEmpty {
                        Text(modifierNames.joined(separator: ", "))
                            .font(.system(size: 12))
                            .foregroundStyle(AppColors.accentLight)
                    }

                    if let notes = item.notes, !notes.isEmpty {
                        Text("Note: \(notes)")
                            .font(.system(size: 12))
                            .foregroundStyle(AppColors.textSecondary)
                    }
                }
                Spacer()
                Button(action: onRemove) {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(AppColors.accentLight)
                }
            }

            // Quantity + price
            HStack {
                HStack(spacing: 8) {
                    Button(action: onDecrement) {
                        Text("\u{2212}")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 32, height: 32)
                            .background(AppColors.borderLight)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    }

                    Text("\(item.quantity)")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 40)

                    Button(action: onIncrement) {
                        Text("+")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 32, height: 32)
                            .background(AppColors.borderLight)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                }

                Spacer()

                Text(CurrencyFormatter.formatShort(item.lineTotal))
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
            }

            // Add notes button
            Button(action: onNotesTap) {
                Text("Add Notes")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(AppColors.textSecondary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 32)
                    .background(AppColors.borderLight)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
            }
        }
        .padding(12)
        .background(AppColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(AppColors.borderLight, lineWidth: 1)
        )
    }
}
