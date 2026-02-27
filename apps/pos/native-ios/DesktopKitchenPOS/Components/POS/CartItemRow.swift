import SwiftUI

struct CartItemRow: View {
    let item: CartItem
    let onQuantityChange: (String, Int) -> Void
    let onAddNote: (CartItem) -> Void
    let onRemove: (String) -> Void

    var body: some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.item_name)
                    .font(AppFonts.subheadline)
                    .foregroundStyle(.white)
                    .lineLimit(1)

                // Show selected modifiers
                if let modNames = item.selectedModifierNames, !modNames.isEmpty {
                    Text(modNames.joined(separator: ", "))
                        .font(AppFonts.caption)
                        .foregroundStyle(AppColors.accentLight)
                        .lineLimit(1)
                }

                Text(CurrencyFormatter.formatShort(item.unit_price))
                    .font(AppFonts.caption)
                    .foregroundStyle(AppColors.textTertiary)

                if let notes = item.notes {
                    Text(notes)
                        .font(AppFonts.caption)
                        .foregroundStyle(AppColors.warning)
                        .lineLimit(1)
                }
            }

            Spacer()

            // Quantity stepper — 36pt buttons with 44pt hit area
            HStack(spacing: 6) {
                Button { onQuantityChange(item.cart_id, item.quantity - 1) } label: {
                    Image(systemName: "minus")
                        .font(.system(size: 13, weight: .bold))
                        .frame(width: 36, height: 36)
                        .background(AppColors.surface)
                        .clipShape(Circle())
                }
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)

                Text("\(item.quantity)")
                    .font(AppFonts.headline)
                    .foregroundStyle(.white)
                    .frame(minWidth: 24)

                Button { onQuantityChange(item.cart_id, item.quantity + 1) } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 13, weight: .bold))
                        .frame(width: 36, height: 36)
                        .background(AppColors.surface)
                        .clipShape(Circle())
                }
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)
            }

            Text(CurrencyFormatter.formatShort(item.lineTotal))
                .font(AppFonts.headline)
                .foregroundStyle(.white)
                .frame(width: 70, alignment: .trailing)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .contentShape(Rectangle())
        .contextMenu {
            Button { onAddNote(item) } label: {
                Label("Add Note", systemImage: "note.text")
            }
            Button(role: .destructive) { onRemove(item.cart_id) } label: {
                Label("Remove", systemImage: "trash")
            }
        }
    }
}
