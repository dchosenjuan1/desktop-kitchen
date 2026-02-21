import SwiftUI
import Charts

struct ReportsScreen: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = ReportsViewModel()

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                screenHeader(title: "Sales Reports") {
                    appState.navigate(to: .admin)
                }
                Spacer()
                ShareLink(item: viewModel.generateCSV(), preview: SharePreview("Sales Report CSV")) {
                    HStack(spacing: 8) {
                        Image(systemName: "square.and.arrow.up")
                        Text("Export CSV")
                    }
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(AppColors.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .padding(.trailing, 24)
            }
            .background(AppColors.card)
            .overlay(alignment: .bottom) {
                Rectangle().fill(AppColors.border).frame(height: 1)
            }

            ScrollView {
                VStack(spacing: 24) {
                    if let error = viewModel.error {
                        errorCard(error)
                    }

                    // Period toggle
                    periodToggle

                    if viewModel.isLoading {
                        loadingPlaceholders
                    } else {
                        // Summary cards
                        summaryCards

                        // Hourly chart
                        if !viewModel.hourlyData.isEmpty {
                            hourlyChart
                        }

                        // Top items chart
                        if !viewModel.topItems.isEmpty {
                            topItemsChart
                        }

                        // Employee table
                        if !viewModel.employeePerf.isEmpty {
                            employeeTable
                        }

                        // Empty state
                        if viewModel.topItems.isEmpty && viewModel.employeePerf.isEmpty {
                            emptyState
                        }
                    }
                }
                .padding(24)
            }
        }
        .background(AppColors.background)
        .task { await viewModel.loadData() }
        .onChange(of: viewModel.period) {
            Task { await viewModel.loadData() }
        }
    }

    // MARK: - Period Toggle

    private var periodToggle: some View {
        HStack(spacing: 12) {
            ForEach(ReportPeriod.allCases, id: \.self) { p in
                Button {
                    viewModel.period = p
                } label: {
                    Text(p.label)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(viewModel.period == p ? .white : AppColors.textSecondary)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(viewModel.period == p ? AppColors.accent : AppColors.card)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(viewModel.period == p ? Color.clear : AppColors.border, lineWidth: 1)
                        )
                }
            }
            Spacer()
        }
    }

    // MARK: - Summary Cards

    private var summaryCards: some View {
        HStack(spacing: 16) {
            StatCard(label: "Total Revenue", value: CurrencyFormatter.format(viewModel.salesData?.total_revenue ?? 0), isAccent: true)
            StatCard(label: "Order Count", value: "\(viewModel.salesData?.order_count ?? 0)")
            StatCard(label: "Avg Ticket", value: CurrencyFormatter.format(viewModel.salesData?.avg_ticket ?? 0))
            StatCard(label: "Total Tips", value: CurrencyFormatter.format(viewModel.salesData?.tip_total ?? 0))
        }
    }

    // MARK: - Hourly Chart

    private var hourlyChart: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Hourly Sales Breakdown")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)

            Chart(viewModel.hourlyData) { item in
                BarMark(
                    x: .value("Hour", item.hourLabel),
                    y: .value("Revenue", item.revenue)
                )
                .foregroundStyle(AppColors.accent)
            }
            .frame(height: 300)
            .chartXAxis {
                AxisMarks { _ in
                    AxisValueLabel()
                        .foregroundStyle(AppColors.textTertiary)
                }
            }
            .chartYAxis {
                AxisMarks { _ in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                        .foregroundStyle(AppColors.borderLight)
                    AxisValueLabel()
                        .foregroundStyle(AppColors.textTertiary)
                }
            }
        }
        .padding(24)
        .cardStyle()
    }

    // MARK: - Top Items Chart

    private var topItemsChart: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Top Selling Items")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)

            Chart(viewModel.topItems) { item in
                BarMark(
                    x: .value("Revenue", item.revenue),
                    y: .value("Item", item.item_name)
                )
                .foregroundStyle(AppColors.accent)
            }
            .frame(height: CGFloat(viewModel.topItems.count * 40))
            .chartXAxis {
                AxisMarks { _ in
                    AxisValueLabel()
                        .foregroundStyle(AppColors.textTertiary)
                }
            }
            .chartYAxis {
                AxisMarks { _ in
                    AxisValueLabel()
                        .foregroundStyle(AppColors.textSecondary)
                }
            }
        }
        .padding(24)
        .cardStyle()
    }

    // MARK: - Employee Table

    private var employeeTable: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Employee Performance")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)

            VStack(spacing: 0) {
                // Header
                HStack {
                    Text("Employee").frame(maxWidth: .infinity, alignment: .leading)
                    Text("Orders").frame(width: 80, alignment: .trailing)
                    Text("Total Sales").frame(width: 120, alignment: .trailing)
                    Text("Avg Ticket").frame(width: 100, alignment: .trailing)
                    Text("Tips").frame(width: 100, alignment: .trailing)
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(AppColors.textSecondary)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(AppColors.surface)

                ForEach(viewModel.employeePerf) { emp in
                    HStack {
                        Text(emp.employee_name)
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Text("\(emp.orders_processed)")
                            .frame(width: 80, alignment: .trailing)
                            .foregroundStyle(AppColors.textSecondary)
                        Text(CurrencyFormatter.format(emp.total_sales))
                            .frame(width: 120, alignment: .trailing)
                            .foregroundStyle(AppColors.textSecondary)
                        Text(CurrencyFormatter.format(emp.avg_ticket))
                            .frame(width: 100, alignment: .trailing)
                            .foregroundStyle(AppColors.textSecondary)
                        Text(CurrencyFormatter.format(emp.tips_received))
                            .frame(width: 100, alignment: .trailing)
                            .foregroundStyle(AppColors.successLight)
                            .fontWeight(.medium)
                    }
                    .font(.system(size: 14))
                    .padding(.horizontal, 24)
                    .padding(.vertical, 16)
                    .overlay(alignment: .bottom) {
                        Rectangle().fill(AppColors.border).frame(height: 1)
                    }
                }
            }
        }
        .padding(24)
        .cardStyle()
    }

    // MARK: - Loading / Empty

    private var loadingPlaceholders: some View {
        VStack(spacing: 24) {
            ForEach(0..<3, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 12)
                    .fill(AppColors.card)
                    .frame(height: 256)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(AppColors.border, lineWidth: 1)
                    )
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "chart.bar.xaxis")
                .font(.system(size: 40))
                .foregroundStyle(AppColors.textMuted)
            Text("No data available for this period")
                .foregroundStyle(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(48)
        .cardStyle()
    }
}
