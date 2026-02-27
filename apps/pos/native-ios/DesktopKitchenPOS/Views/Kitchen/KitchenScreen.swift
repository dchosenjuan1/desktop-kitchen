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
                        VStack(spacing: 20) {
                            ForEach(vm.groupedOrders) { group in
                                orderGroupSection(group)
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
            .frame(width: 44, height: 44)

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
            .frame(width: 44, height: 44)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    // MARK: - Order Group Section (Phase 3)

    private func orderGroupSection(_ group: KitchenViewModel.OrderGroup) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Group header
            HStack(spacing: 6) {
                Image(systemName: group.icon)
                    .foregroundStyle(group.color)
                Text(group.label)
                    .font(AppFonts.headline)
                    .foregroundStyle(.white)
                Text("(\(group.orders.count))")
                    .font(AppFonts.subheadline)
                    .foregroundStyle(AppColors.textTertiary)
            }

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 300), spacing: 16)], spacing: 16) {
                ForEach(group.orders) { order in
                    orderCard(order)
                }
            }
        }
    }

    // MARK: - Order Card

    private func orderCard(_ order: Order) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Card header
            HStack {
                Text("#\(order.order_number)")
                    .font(AppFonts.title3)
                    .foregroundStyle(.white)

                // Source badge
                if let source = order.source, source != .pos {
                    Text(sourceName(source))
                        .font(AppFonts.caption)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(sourceColor(source))
                        .clipShape(Capsule())
                }

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
                                if let modifiers = item.modifiers, !modifiers.isEmpty {
                                    Text(modifiers.map(\.modifier_name).joined(separator: ", "))
                                        .font(AppFonts.caption)
                                        .foregroundStyle(AppColors.accentLight)
                                }
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

            // Actions — bigger buttons (56pt+)
            HStack(spacing: 12) {
                if order.status == .pending {
                    Button {
                        Task { await vm.startOrder(id: order.id) }
                    } label: {
                        Label("Start", systemImage: "play.fill")
                            .font(.system(size: 17, weight: .bold))
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                    }
                    .foregroundStyle(.white)
                    .background(AppColors.info)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                } else if order.status == .preparing {
                    Button {
                        Task { await vm.markReady(id: order.id) }
                    } label: {
                        Label("DONE", systemImage: "checkmark.circle.fill")
                            .font(.system(size: 20, weight: .black))
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                    }
                    .foregroundStyle(.white)
                    .background(AppColors.success)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .sensoryFeedback(.success, trigger: order.status)
                }
            }
            .padding(14)
        }
        .cardStyle()
    }

    // MARK: - Helpers

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

    private func sourceName(_ source: OrderSource) -> String {
        switch source {
        case .pos: return "POS"
        case .uber_eats: return "Uber Eats"
        case .rappi: return "Rappi"
        case .didi_food: return "DiDi"
        }
    }

    private func sourceColor(_ source: OrderSource) -> Color {
        switch source {
        case .pos: return AppColors.accent
        case .uber_eats: return Color(hex: 0x06C167)
        case .rappi: return Color(hex: 0xFF441F)
        case .didi_food: return Color(hex: 0xFF6600)
        }
    }
}
