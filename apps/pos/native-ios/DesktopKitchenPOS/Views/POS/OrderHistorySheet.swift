import SwiftUI

struct OrderHistorySheet: View {
    @State private var vm = OrderHistoryViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Filter pills
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(vm.filterOptions, id: \.label) { option in
                                Button {
                                    vm.selectedFilter = option.value
                                } label: {
                                    Text(option.label)
                                        .font(AppFonts.subheadline)
                                        .fontWeight(.semibold)
                                        .foregroundStyle(vm.selectedFilter == option.value ? .white : AppColors.textSecondary)
                                        .padding(.horizontal, 16)
                                        .padding(.vertical, 8)
                                        .background(vm.selectedFilter == option.value ? AppColors.accent : AppColors.surface)
                                        .clipShape(Capsule())
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    }

                    Divider().background(AppColors.border)

                    if vm.isLoading {
                        Spacer()
                        ProgressView().tint(.white)
                        Spacer()
                    } else if vm.filteredOrders.isEmpty {
                        Spacer()
                        VStack(spacing: 8) {
                            Image(systemName: "tray")
                                .font(.system(size: 40))
                                .foregroundStyle(AppColors.textMuted)
                            Text("No orders")
                                .font(AppFonts.subheadline)
                                .foregroundStyle(AppColors.textTertiary)
                        }
                        Spacer()
                    } else {
                        List {
                            ForEach(vm.filteredOrders) { order in
                                orderRow(order)
                                    .listRowBackground(AppColors.card)
                                    .listRowSeparatorTint(AppColors.border)
                            }
                        }
                        .listStyle(.plain)
                        .scrollContentBackground(.hidden)
                    }
                }
            }
            .navigationTitle("Order History")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                        .foregroundStyle(AppColors.textSecondary)
                }
            }
        }
        .onAppear { vm.startPolling() }
        .onDisappear { vm.stopPolling() }
    }

    private func orderRow(_ order: Order) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text("#\(order.order_number)")
                        .font(AppFonts.headline)
                        .foregroundStyle(.white)

                    statusBadge(order.status)
                }

                if let items = order.items {
                    Text(items.map { "\($0.quantity)x \($0.item_name)" }.joined(separator: ", "))
                        .font(AppFonts.caption)
                        .foregroundStyle(AppColors.textTertiary)
                        .lineLimit(1)
                }

                if let dateStr = order.created_at, let time = DateFormatters.parseISO(dateStr) {
                    Text(DateFormatters.timeOnly.string(from: time))
                        .font(AppFonts.caption)
                        .foregroundStyle(AppColors.textMuted)
                }
            }

            Spacer()

            Text(CurrencyFormatter.format(order.total))
                .font(AppFonts.headline)
                .foregroundStyle(.white)
        }
        .padding(.vertical, 4)
    }

    private func statusBadge(_ status: OrderStatus) -> some View {
        Text(status.displayName)
            .font(AppFonts.caption)
            .fontWeight(.bold)
            .foregroundStyle(.white)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(statusColor(status))
            .clipShape(Capsule())
    }

    private func statusColor(_ status: OrderStatus) -> Color {
        switch status {
        case .pending: return AppColors.warning
        case .confirmed, .preparing: return AppColors.info
        case .ready: return AppColors.success
        case .completed: return AppColors.textMuted
        case .cancelled: return AppColors.error
        }
    }
}
