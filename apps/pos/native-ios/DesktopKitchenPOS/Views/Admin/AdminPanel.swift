import SwiftUI

struct AdminPanel: View {
    @Environment(AppState.self) private var appState
    @State private var vm = AdminViewModel()

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                HStack {
                    Button { appState.navigate(to: .pos) } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(AppColors.textSecondary)
                    }

                    Text("Dashboard")
                        .font(AppFonts.title2)
                        .foregroundStyle(.white)

                    Spacer()

                    Button { appState.logout() } label: {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .foregroundStyle(AppColors.textSecondary)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 14)

                Divider().background(AppColors.border)

                if vm.isLoading {
                    Spacer()
                    ProgressView().tint(.white)
                    Spacer()
                } else {
                    ScrollView {
                        VStack(spacing: 20) {
                            // KPI Cards
                            if let stats = vm.dailyStats {
                                kpiSection(stats)
                            }

                            // Navigation Grid
                            navSection

                            // Low stock alerts
                            if !vm.lowStockItems.isEmpty {
                                lowStockSection
                            }
                        }
                        .padding(20)
                    }
                }
            }
        }
        .task { await vm.loadData() }
    }

    // MARK: - KPI Section

    private func kpiSection(_ stats: SalesReport) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Today's Sales")
                .font(AppFonts.headline)
                .foregroundStyle(AppColors.textSecondary)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                kpiCard("Revenue", CurrencyFormatter.format(stats.total_revenue), "dollarsign.circle", AppColors.success)
                kpiCard("Orders", "\(stats.order_count)", "bag", AppColors.info)
                kpiCard("Avg Ticket", CurrencyFormatter.format(stats.avg_ticket), "receipt", AppColors.accent)
                kpiCard("Tips", CurrencyFormatter.format(stats.tip_total), "heart", AppColors.warning)
            }
        }
    }

    private func kpiCard(_ title: String, _ value: String, _ icon: String, _ color: Color) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundStyle(color)
            Text(value)
                .font(AppFonts.title3)
                .foregroundStyle(.white)
            Text(title)
                .font(AppFonts.caption)
                .foregroundStyle(AppColors.textTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .cardStyle()
    }

    // MARK: - Navigation Section

    private var navSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Management")
                .font(AppFonts.headline)
                .foregroundStyle(AppColors.textSecondary)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                navButton("Reports", "doc.text", AppColors.info) { appState.navigate(to: .reports) }
                navButton("Inventory", "shippingbox", AppColors.warning) { appState.navigate(to: .inventory) }
                navButton("Employees", "person.2", AppColors.success) { appState.navigate(to: .employees) }
                navButton("Menu", "menucard", AppColors.accent) { appState.navigate(to: .menuManagement) }
            }
        }
    }

    private func navButton(_ title: String, _ icon: String, _ color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 28))
                    .foregroundStyle(color)
                Text(title)
                    .font(AppFonts.headline)
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
            .cardStyle()
        }
        .buttonStyle(.plain)
    }

    // MARK: - Low Stock Section

    private var lowStockSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(AppColors.warning)
                Text("Low Stock Alerts")
                    .font(AppFonts.headline)
                    .foregroundStyle(AppColors.warning)
                Spacer()
                Text("\(vm.lowStockItems.count) items")
                    .font(AppFonts.footnote)
                    .foregroundStyle(AppColors.textTertiary)
            }

            VStack(spacing: 0) {
                ForEach(vm.lowStockItems) { item in
                    HStack {
                        Circle()
                            .fill(item.stockStatus == .outOfStock ? AppColors.error : AppColors.warning)
                            .frame(width: 8, height: 8)

                        Text(item.name)
                            .font(AppFonts.subheadline)
                            .foregroundStyle(.white)

                        Spacer()

                        Text("\(item.quantity, specifier: "%.1f") \(item.unit)")
                            .font(AppFonts.subheadline)
                            .foregroundStyle(AppColors.textSecondary)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)

                    if item.id != vm.lowStockItems.last?.id {
                        Divider().background(AppColors.border)
                    }
                }
            }
            .cardStyle()
        }
    }
}
