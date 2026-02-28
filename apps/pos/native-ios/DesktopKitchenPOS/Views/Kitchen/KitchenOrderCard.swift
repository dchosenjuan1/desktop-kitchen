import SwiftUI

struct KitchenOrderCard: View {
    let order: Order
    let elapsed: Int
    let isUrgent: Bool
    let onStart: () -> Void
    let onReady: () -> Void

    @State private var actionLoading = false

    private var statusColor: Color {
        switch order.status {
        case .pending: return AppColors.accentLight
        case .preparing: return AppColors.warning
        default: return AppColors.textMuted
        }
    }

    private var statusBadgeColor: Color {
        switch order.status {
        case .pending: return AppColors.accent
        case .preparing: return AppColors.warning
        default: return AppColors.textMuted
        }
    }

    private var statusLabel: String {
        switch order.status {
        case .pending: return "PENDING"
        case .preparing: return "PREPARING"
        default: return order.status.rawValue.uppercased()
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("#\(order.order_number)")
                        .font(.system(size: 48, weight: .black))
                        .tracking(-2)
                        .foregroundStyle(.white)
                    Text("Order ID: \(String(order.id).prefix(8))")
                        .font(.system(size: 13))
                        .foregroundStyle(AppColors.textTertiary)
                }
                Spacer()
                Text(statusLabel)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(order.status == .preparing ? AppColors.background : .white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(statusBadgeColor)
                    .clipShape(Capsule())
            }
            .padding(.bottom, 16)
            .overlay(alignment: .bottom) {
                Rectangle().fill(AppColors.border).frame(height: 1)
            }

            // Elapsed time
            HStack(spacing: 8) {
                Image(systemName: "clock")
                    .font(.system(size: 20))
                Text(DateFormatters.formatElapsed(seconds: elapsed))
                    .font(.system(size: 17, weight: .semibold))
                if isUrgent {
                    Text("URGENT")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(AppColors.accentLight)
                }
            }
            .foregroundStyle(isUrgent ? AppColors.accentLight : AppColors.textSecondary)
            .padding(.vertical, 16)

            // Items
            VStack(spacing: 12) {
                if let items = order.items, !items.isEmpty {
                    ForEach(items) { item in
                        kitchenItemRow(item)
                    }
                } else {
                    Text("No items")
                        .font(.system(size: 15))
                        .foregroundStyle(AppColors.textTertiary)
                        .italic()
                }
            }
            .padding(.bottom, 24)

            Spacer(minLength: 0)

            // Action buttons
            actionButtons
        }
        .padding(24)
        .background(AppColors.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(AppColors.border, lineWidth: 1)
        )
        .overlay(alignment: .leading) {
            Rectangle()
                .fill(isUrgent ? AppColors.accentLight : statusColor)
                .frame(width: 4)
                .clipShape(RoundedRectangle(cornerRadius: 2))
        }
    }

    // MARK: - Kitchen Item Row

    private func kitchenItemRow(_ item: OrderItem) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(item.item_name)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(.white)
                Spacer()
                Text("x\(item.quantity)")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(AppColors.textSecondary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 4)
                    .background(AppColors.borderLight)
                    .clipShape(Capsule())
            }
            if let notes = item.notes, !notes.isEmpty {
                Text(notes)
                    .font(.system(size: 15))
                    .italic()
                    .foregroundStyle(Color(hex: 0xFCA5A5))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(hex: 0x7F1D1D).opacity(0.2))
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                    .overlay(alignment: .leading) {
                        Rectangle().fill(AppColors.accentLight).frame(width: 2)
                    }
            }
        }
        .padding(12)
        .background(AppColors.surface.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(AppColors.borderLight, lineWidth: 1)
        )
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        Group {
            if order.status == .pending {
                HStack(spacing: 12) {
                    Button {
                        Task {
                            actionLoading = true
                            onStart()
                            actionLoading = false
                        }
                    } label: {
                        Text(actionLoading ? "Starting..." : "Start")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(AppColors.accent)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    .disabled(actionLoading)

                    Text("Click \"Start\" First")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(AppColors.textMuted)
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                        .background(AppColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            } else if order.status == .preparing {
                Button {
                    Task {
                        actionLoading = true
                        onReady()
                        actionLoading = false
                    }
                } label: {
                    Text(actionLoading ? "Marking Ready..." : "Ready for Pickup")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 48)
                        .background(AppColors.success)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .disabled(actionLoading)
            }
        }
    }
}
