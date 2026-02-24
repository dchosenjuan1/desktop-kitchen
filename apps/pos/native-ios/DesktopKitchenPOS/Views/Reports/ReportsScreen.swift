import SwiftUI

struct ReportsScreen: View {
    @Environment(AppState.self) private var appState
    @State private var vm = ReportsViewModel()

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                HStack {
                    Button { appState.navigate(to: .admin) } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(AppColors.textSecondary)
                    }

                    Text("Reports")
                        .font(AppFonts.title2)
                        .foregroundStyle(.white)

                    Spacer()

                    // Period picker
                    Picker("Period", selection: Bindable(vm).period) {
                        ForEach(ReportPeriod.allCases, id: \.self) { period in
                            Text(period.label).tag(period)
                        }
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 300)
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
                            // Sales summary
                            if let sales = vm.salesData {
                                salesSummary(sales)
                            }

                            HStack(alignment: .top, spacing: 20) {
                                // Top items
                                topItemsSection
                                // Employee performance
                                employeePerfSection
                            }
                        }
                        .padding(20)
                    }
                }
            }
        }
        .task { await vm.loadData() }
        .onChange(of: vm.period) {
            Task { await vm.loadData() }
        }
    }

    // MARK: - Sales Summary

    private func salesSummary(_ stats: SalesReport) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            statCard("Total Revenue", CurrencyFormatter.format(stats.total_revenue), AppColors.success)
            statCard("Orders", "\(stats.order_count)", AppColors.info)
            statCard("Avg Ticket", CurrencyFormatter.format(stats.avg_ticket), AppColors.accent)
            statCard("Tips", CurrencyFormatter.format(stats.tip_total), AppColors.warning)
        }
    }

    private func statCard(_ title: String, _ value: String, _ color: Color) -> some View {
        VStack(spacing: 6) {
            Text(value)
                .font(AppFonts.title2)
                .foregroundStyle(.white)
            Text(title)
                .font(AppFonts.caption)
                .foregroundStyle(AppColors.textTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(color)
                .frame(height: 3)
        }
        .cardStyle()
    }

    // MARK: - Top Items

    private var topItemsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Top Items")
                .font(AppFonts.headline)
                .foregroundStyle(AppColors.textSecondary)

            VStack(spacing: 0) {
                if vm.topItems.isEmpty {
                    Text("No data")
                        .font(AppFonts.subheadline)
                        .foregroundStyle(AppColors.textTertiary)
                        .padding(20)
                } else {
                    ForEach(Array(vm.topItems.enumerated()), id: \.element.id) { index, item in
                        HStack {
                            Text("\(index + 1)")
                                .font(AppFonts.caption)
                                .foregroundStyle(AppColors.textMuted)
                                .frame(width: 24)

                            Text(item.item_name)
                                .font(AppFonts.subheadline)
                                .foregroundStyle(.white)
                                .lineLimit(1)

                            Spacer()

                            Text("\(item.quantity_sold) sold")
                                .font(AppFonts.caption)
                                .foregroundStyle(AppColors.textTertiary)

                            Text(CurrencyFormatter.format(item.revenue))
                                .font(AppFonts.subheadline)
                                .foregroundStyle(AppColors.successLight)
                                .frame(width: 90, alignment: .trailing)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)

                        if index < vm.topItems.count - 1 {
                            Divider().background(AppColors.border)
                        }
                    }
                }
            }
            .cardStyle()
        }
    }

    // MARK: - Employee Performance

    private var employeePerfSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Employee Performance")
                .font(AppFonts.headline)
                .foregroundStyle(AppColors.textSecondary)

            VStack(spacing: 0) {
                if vm.employeePerf.isEmpty {
                    Text("No data")
                        .font(AppFonts.subheadline)
                        .foregroundStyle(AppColors.textTertiary)
                        .padding(20)
                } else {
                    ForEach(vm.employeePerf) { emp in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(emp.employee_name)
                                    .font(AppFonts.subheadline)
                                    .foregroundStyle(.white)
                                Text("\(emp.orders_processed) orders")
                                    .font(AppFonts.caption)
                                    .foregroundStyle(AppColors.textTertiary)
                            }

                            Spacer()

                            VStack(alignment: .trailing, spacing: 2) {
                                Text(CurrencyFormatter.format(emp.total_sales))
                                    .font(AppFonts.subheadline)
                                    .foregroundStyle(.white)
                                Text("Tips: \(CurrencyFormatter.format(emp.tips_received))")
                                    .font(AppFonts.caption)
                                    .foregroundStyle(AppColors.successLight)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)

                        if emp.id != vm.employeePerf.last?.id {
                            Divider().background(AppColors.border)
                        }
                    }
                }
            }
            .cardStyle()
        }
    }
}
