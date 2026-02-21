import SwiftUI

struct AdminPanel: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = AdminViewModel()

    var body: some View {
        VStack(spacing: 0) {
            // Header
            screenHeader(title: "Admin Panel") {
                appState.navigate(to: .pos)
            }

            ScrollView {
                VStack(spacing: 24) {
                    if let error = viewModel.error {
                        errorCard(error)
                    }

                    // Stats cards
                    if viewModel.isLoading {
                        loadingCards
                    } else {
                        statsCards
                    }

                    // Navigation cards
                    navCards

                    // Low stock alerts
                    if !viewModel.lowStockItems.isEmpty {
                        lowStockSection
                    }
                }
                .padding(24)
            }
        }
        .background(AppColors.background)
        .task { await viewModel.loadData() }
    }

    // MARK: - Stats Cards

    private var loadingCards: some View {
        HStack(spacing: 16) {
            ForEach(0..<4, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 12)
                    .fill(AppColors.card)
                    .frame(height: 100)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(AppColors.border, lineWidth: 1)
                    )
            }
        }
    }

    private var statsCards: some View {
        HStack(spacing: 16) {
            StatCard(label: "Today's Revenue", value: CurrencyFormatter.format(viewModel.dailyStats?.total_revenue ?? 0), isAccent: true)
            StatCard(label: "Orders", value: "\(viewModel.dailyStats?.order_count ?? 0)")
            StatCard(label: "Avg Ticket", value: CurrencyFormatter.format(viewModel.dailyStats?.avg_ticket ?? 0))
            StatCard(label: "Total Tips", value: CurrencyFormatter.format(viewModel.dailyStats?.tip_total ?? 0))
        }
    }

    // MARK: - Nav Cards

    private var navCards: some View {
        LazyVGrid(columns: [
            GridItem(.flexible(), spacing: 16),
            GridItem(.flexible(), spacing: 16),
            GridItem(.flexible(), spacing: 16),
            GridItem(.flexible(), spacing: 16),
        ], spacing: 16) {
            NavCard(icon: "fork.knife", title: "Menu Management", subtitle: "Manage menu items, categories, and pricing") {
                appState.navigate(to: .menuManagement)
            }
            NavCard(icon: "shippingbox", title: "Inventory", subtitle: "Track stock levels and restock items") {
                appState.navigate(to: .inventory)
            }
            NavCard(icon: "person.2", title: "Employees", subtitle: "Add, edit, and manage staff accounts") {
                appState.navigate(to: .employees)
            }
            NavCard(icon: "chart.bar", title: "Reports", subtitle: "View sales reports and analytics") {
                appState.navigate(to: .reports)
            }
        }
    }

    // MARK: - Low Stock

    private var lowStockSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 8) {
                Image(systemName: "exclamationmark.triangle")
                    .foregroundStyle(AppColors.accentLight)
                Text("Low Stock Alerts")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(.white)
            }

            ForEach(viewModel.lowStockItems.prefix(5)) { item in
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.name)
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(.white)
                        Text("\(Int(item.quantity)) \(item.unit) remaining")
                            .font(.system(size: 13))
                            .foregroundStyle(AppColors.textSecondary)
                    }
                    Spacer()
                    Button("Restock") {
                        appState.navigate(to: .inventory)
                    }
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(AppColors.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .padding(12)
                .background(Color(hex: 0x7F1D1D).opacity(0.2))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color(hex: 0x7F1D1D).opacity(0.4), lineWidth: 1)
                )
            }
        }
        .padding(24)
        .cardStyle()
    }
}

// MARK: - Reusable Components

struct StatCard: View {
    let label: String
    let value: String
    var isAccent: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(AppColors.textSecondary)
            Text(value)
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(isAccent ? AppColors.accentLight : .white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(24)
        .cardStyle()
    }
}

struct NavCard: View {
    let icon: String
    let title: String
    let subtitle: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 28))
                    .foregroundStyle(AppColors.accentLight)
                    .frame(width: 48, height: 48)
                    .background(AppColors.accent.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                Text(title)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(.white)

                Text(subtitle)
                    .font(.system(size: 14))
                    .foregroundStyle(AppColors.textSecondary)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(32)
            .background(AppColors.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(AppColors.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Shared Screen Header

func screenHeader(title: String, backAction: @escaping () -> Void) -> some View {
    HStack(spacing: 16) {
        Button(action: backAction) {
            Image(systemName: "chevron.left")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)
                .padding(8)
                .background(AppColors.surface.opacity(0.01))
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }

        Image("Logo")
            .resizable()
            .scaledToFit()
            .frame(height: 32)

        Text(title)
            .font(.system(size: 28, weight: .black))
            .tracking(-1)
            .foregroundStyle(.white)

        Spacer()
    }
    .padding(.horizontal, 24)
    .padding(.vertical, 16)
    .background(AppColors.card)
    .overlay(alignment: .bottom) {
        Rectangle().fill(AppColors.border).frame(height: 1)
    }
}

func errorCard(_ message: String) -> some View {
    HStack {
        Text(message)
            .foregroundStyle(Color(hex: 0xFCA5A5))
        Spacer()
    }
    .padding(16)
    .background(Color(hex: 0x7F1D1D).opacity(0.3))
    .clipShape(RoundedRectangle(cornerRadius: 8))
    .overlay(
        RoundedRectangle(cornerRadius: 8)
            .stroke(Color(hex: 0x7F1D1D), lineWidth: 1)
    )
}
