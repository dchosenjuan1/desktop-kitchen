import SwiftUI

struct KitchenScreen: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = KitchenViewModel()

    private let columns = [
        GridItem(.flexible(), spacing: 24),
        GridItem(.flexible(), spacing: 24),
        GridItem(.flexible(), spacing: 24),
    ]

    var body: some View {
        VStack(spacing: 0) {
            // Header
            headerBar

            // Error banner
            if let error = viewModel.error {
                errorBanner(error)
            }

            // Content
            if viewModel.isLoading && viewModel.orders.isEmpty {
                loadingView
            } else if viewModel.orders.isEmpty {
                emptyView
            } else {
                ordersGrid
            }
        }
        .background(AppColors.background)
        .onAppear { viewModel.startPolling() }
        .onDisappear { viewModel.stopPolling() }
    }

    // MARK: - Header

    private var headerBar: some View {
        HStack {
            HStack(spacing: 16) {
                Button {
                    appState.navigate(to: .pos)
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 20, weight: .bold))
                        Text("Back")
                            .font(.system(size: 18, weight: .semibold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(AppColors.surface.opacity(0.01))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                Image("Logo")
                    .resizable()
                    .scaledToFit()
                    .frame(height: 32)

                Text("KITCHEN DISPLAY")
                    .font(.system(size: 28, weight: .black))
                    .tracking(-1)
                    .foregroundStyle(.white)
            }

            Spacer()

            HStack(spacing: 16) {
                VStack(spacing: 2) {
                    Text(viewModel.currentTime, style: .time)
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(.white)
                    Text(viewModel.currentTime, format: .dateTime.weekday(.abbreviated).month(.abbreviated).day())
                        .font(.system(size: 12))
                        .foregroundStyle(AppColors.textTertiary)
                }

                if viewModel.pendingCount > 0 {
                    Text("\(viewModel.pendingCount)")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 64, height: 64)
                        .background(AppColors.accent)
                        .clipShape(Circle())
                }
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
        .background(AppColors.card)
        .overlay(alignment: .bottom) {
            Rectangle().fill(AppColors.border).frame(height: 1)
        }
    }

    // MARK: - Error Banner

    private func errorBanner(_ message: String) -> some View {
        HStack {
            Image(systemName: "exclamationmark.triangle")
            Text(message)
        }
        .foregroundStyle(Color(hex: 0xFCA5A5))
        .padding(.horizontal, 24)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: 0x7F1D1D).opacity(0.5))
        .overlay(alignment: .bottom) {
            Rectangle().fill(Color(hex: 0x991B1B)).frame(height: 1)
        }
    }

    // MARK: - Loading

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .tint(AppColors.accent)
                .scaleEffect(2)
            Text("Loading orders...")
                .font(.system(size: 20))
                .foregroundStyle(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Empty

    private var emptyView: some View {
        VStack(spacing: 8) {
            Text("All clear")
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(AppColors.successLight)
            Text("No pending orders")
                .font(.system(size: 20))
                .foregroundStyle(AppColors.textTertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Orders Grid

    private var ordersGrid: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 24) {
                ForEach(viewModel.orders) { order in
                    KitchenOrderCard(
                        order: order,
                        elapsed: viewModel.elapsedSeconds(for: order),
                        isUrgent: viewModel.isUrgent(order),
                        onStart: {
                            Task { await viewModel.startOrder(id: order.id) }
                        },
                        onReady: {
                            Task { await viewModel.markReady(id: order.id) }
                        }
                    )
                }
            }
            .padding(24)
        }
    }
}
