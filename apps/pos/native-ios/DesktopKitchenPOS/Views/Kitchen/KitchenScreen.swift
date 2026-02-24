import SwiftUI

struct KitchenScreen: View {
    @Environment(AppState.self) private var appState
    @State private var vm = KitchenViewModel()

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                header

                Divider().background(AppColors.border)

                if vm.isLoading {
                    Spacer()
                    ProgressView().tint(.white)
                    Spacer()
                } else if vm.orders.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "checkmark.circle")
                            .font(.system(size: 60))
                            .foregroundStyle(AppColors.success)
                        Text("All caught up!")
                            .font(AppFonts.title2)
                            .foregroundStyle(.white)
                        Text("No pending orders")
                            .font(AppFonts.subheadline)
                            .foregroundStyle(AppColors.textSecondary)
                    }
                    Spacer()
                } else {
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 300), spacing: 16)], spacing: 16) {
                            ForEach(vm.orders) { order in
                                orderCard(order)
                            }
                        }
                        .padding(16)
                    }
                }
            }

            if let error = vm.error {
                VStack {
                    Spacer()
                    Text(error)
                        .font(AppFonts.footnote)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(AppColors.error.opacity(0.9))
                        .clipShape(Capsule())
                        .padding(.bottom, 16)
                }
            }
        }
        .onAppear { vm.startPolling() }
        .onDisappear { vm.stopPolling() }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Button { appState.navigate(to: .pos) } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(AppColors.textSecondary)
            }

            Image(systemName: "flame.fill")
                .foregroundStyle(AppColors.accent)
            Text("Kitchen Display")
                .font(AppFonts.title2)
                .foregroundStyle(.white)

            Spacer()

            if vm.pendingCount > 0 {
                Text("\(vm.pendingCount) pending")
                    .font(AppFonts.headline)
                    .foregroundStyle(AppColors.warning)
            }

            Button { appState.logout() } label: {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                    .foregroundStyle(AppColors.textSecondary)
            }
            .padding(.leading, 12)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
    }

    // MARK: - Order Card

    private func orderCard(_ order: Order) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Card header
            HStack {
                Text("#\(order.order_number)")
                    .font(AppFonts.title3)
                    .foregroundStyle(.white)

                Spacer()

                let elapsed = vm.elapsedSeconds(for: order)
                Text(DateFormatters.formatElapsed(seconds: elapsed))
                    .font(AppFonts.footnote)
                    .foregroundStyle(vm.isUrgent(order) ? AppColors.error : AppColors.textTertiary)

                statusBadge(order.status)
            }
            .padding(14)
            .background(vm.isUrgent(order) ? AppColors.error.opacity(0.15) : AppColors.surface.opacity(0.5))

            Divider().background(AppColors.border)

            // Items
            VStack(alignment: .leading, spacing: 6) {
                if let items = order.items {
                    ForEach(items) { item in
                        HStack(alignment: .top, spacing: 8) {
                            Text("\(item.quantity)x")
                                .font(AppFonts.headline)
                                .foregroundStyle(AppColors.accent)
                                .frame(width: 30, alignment: .trailing)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.item_name)
                                    .font(AppFonts.subheadline)
                                    .foregroundStyle(.white)
                                if let notes = item.notes, !notes.isEmpty {
                                    Text(notes)
                                        .font(AppFonts.caption)
                                        .foregroundStyle(AppColors.warning)
                                }
                            }
                        }
                    }
                }
            }
            .padding(14)

            Divider().background(AppColors.border)

            // Actions
            HStack(spacing: 12) {
                if order.status == .pending {
                    Button {
                        Task { await vm.startOrder(id: order.id) }
                    } label: {
                        Label("Start", systemImage: "play.fill")
                            .font(AppFonts.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    }
                    .foregroundStyle(.white)
                    .background(AppColors.info)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                } else if order.status == .preparing {
                    Button {
                        Task { await vm.markReady(id: order.id) }
                    } label: {
                        Label("Ready", systemImage: "checkmark.circle.fill")
                            .font(AppFonts.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                    }
                    .foregroundStyle(.white)
                    .background(AppColors.success)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            .padding(14)
        }
        .cardStyle()
    }

    private func statusBadge(_ status: OrderStatus) -> some View {
        Text(status.displayName)
            .font(AppFonts.caption)
            .fontWeight(.bold)
            .foregroundStyle(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor(status))
            .clipShape(Capsule())
    }

    private func statusColor(_ status: OrderStatus) -> Color {
        switch status {
        case .pending: return AppColors.warning
        case .preparing: return AppColors.info
        case .ready: return AppColors.success
        default: return AppColors.textMuted
        }
    }
}
