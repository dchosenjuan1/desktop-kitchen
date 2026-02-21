import SwiftUI

struct InventoryScreen: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = InventoryViewModel()

    var body: some View {
        VStack(spacing: 0) {
            screenHeader(title: "Inventory") {
                appState.navigate(to: .admin)
            }

            ScrollView {
                VStack(spacing: 24) {
                    if let error = viewModel.error {
                        errorCard(error)
                    }

                    // Filters
                    filtersSection

                    // Table
                    if viewModel.isLoading {
                        loadingPlaceholder
                    } else if viewModel.filteredItems.isEmpty {
                        emptyState
                    } else {
                        inventoryTable
                    }

                    // Summary
                    if !viewModel.isLoading && !viewModel.filteredItems.isEmpty {
                        summaryCards
                    }
                }
                .padding(24)
            }
        }
        .background(AppColors.background)
        .task { await viewModel.loadData() }
    }

    // MARK: - Filters

    private var filtersSection: some View {
        HStack(spacing: 16) {
            // Search
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(AppColors.textTertiary)
                TextField("Search items...", text: $viewModel.searchTerm)
                    .foregroundStyle(.white)
            }
            .padding(10)
            .background(AppColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppColors.borderLight, lineWidth: 1))

            // Category picker
            Picker("Category", selection: $viewModel.selectedCategory) {
                ForEach(viewModel.categories, id: \.self) { cat in
                    Text(cat == "all" ? "All Categories" : cat).tag(cat)
                }
            }
            .pickerStyle(.menu)
            .tint(AppColors.textSecondary)
            .padding(6)
            .background(AppColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppColors.borderLight, lineWidth: 1))

            // Sort picker
            Picker("Sort", selection: $viewModel.sortBy) {
                ForEach(InventorySortField.allCases, id: \.self) { field in
                    Text(field.label).tag(field)
                }
            }
            .pickerStyle(.menu)
            .tint(AppColors.textSecondary)
            .padding(6)
            .background(AppColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppColors.borderLight, lineWidth: 1))
        }
        .padding(24)
        .cardStyle()
    }

    // MARK: - Table

    private var inventoryTable: some View {
        VStack(spacing: 0) {
            // Header row
            HStack {
                Text("Item Name").frame(maxWidth: .infinity, alignment: .leading)
                Text("Current Stock").frame(width: 140, alignment: .leading)
                Text("Threshold").frame(width: 140, alignment: .leading)
                Text("Status").frame(width: 120, alignment: .leading)
                Text("Actions").frame(width: 200, alignment: .leading)
            }
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(AppColors.textSecondary)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(AppColors.surface)

            ForEach(viewModel.filteredItems) { item in
                inventoryRow(item)
            }
        }
        .cardStyle()
    }

    private func inventoryRow(_ item: InventoryItem) -> some View {
        HStack {
            Text(item.name)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, alignment: .leading)

            Text("\(Int(item.quantity)) \(item.unit)")
                .font(.system(size: 14))
                .foregroundStyle(AppColors.textSecondary)
                .frame(width: 140, alignment: .leading)

            // Threshold (inline edit)
            thresholdCell(item)
                .frame(width: 140, alignment: .leading)

            // Status badge
            stockBadge(item.stockStatus)
                .frame(width: 120, alignment: .leading)

            // Actions
            restockCell(item)
                .frame(width: 200, alignment: .leading)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
        .overlay(alignment: .bottom) {
            Rectangle().fill(AppColors.border).frame(height: 1)
        }
    }

    private func thresholdCell(_ item: InventoryItem) -> some View {
        Group {
            if viewModel.editingThresholdId == item.id {
                HStack(spacing: 4) {
                    TextField("", text: $viewModel.editThresholdValue)
                        .keyboardType(.decimalPad)
                        .frame(width: 60)
                        .padding(4)
                        .background(AppColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                        .foregroundStyle(.white)

                    Button { Task { await viewModel.updateThreshold(id: item.id) } } label: {
                        Image(systemName: "checkmark").foregroundStyle(AppColors.successLight)
                    }
                    .disabled(viewModel.actionLoading)

                    Button {
                        viewModel.editingThresholdId = nil
                        viewModel.editThresholdValue = ""
                    } label: {
                        Image(systemName: "xmark").foregroundStyle(AppColors.textSecondary)
                    }
                }
            } else {
                HStack(spacing: 4) {
                    Text("\(Int(item.low_stock_threshold))")
                        .foregroundStyle(AppColors.textSecondary)
                    Button {
                        viewModel.editingThresholdId = item.id
                        viewModel.editThresholdValue = String(Int(item.low_stock_threshold))
                    } label: {
                        Image(systemName: "pencil")
                            .font(.system(size: 12))
                            .foregroundStyle(AppColors.textTertiary)
                    }
                }
            }
        }
        .font(.system(size: 14))
    }

    private func restockCell(_ item: InventoryItem) -> some View {
        Group {
            if viewModel.restockingId == item.id {
                HStack(spacing: 4) {
                    Button {
                        let current = Double(viewModel.restockAmount) ?? 0
                        viewModel.restockAmount = String(Int(max(0, current - 1)))
                    } label: {
                        Image(systemName: "minus")
                            .frame(width: 28, height: 28)
                            .background(AppColors.borderLight)
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                            .foregroundStyle(.white)
                    }

                    TextField("0", text: $viewModel.restockAmount)
                        .keyboardType(.numberPad)
                        .frame(width: 44)
                        .multilineTextAlignment(.center)
                        .padding(4)
                        .background(AppColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                        .foregroundStyle(.white)

                    Button {
                        let current = Double(viewModel.restockAmount) ?? 0
                        viewModel.restockAmount = String(Int(current + 1))
                    } label: {
                        Image(systemName: "plus")
                            .frame(width: 28, height: 28)
                            .background(AppColors.borderLight)
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                            .foregroundStyle(.white)
                    }

                    Button { Task { await viewModel.restock() } } label: {
                        Image(systemName: "checkmark")
                            .foregroundStyle(.white)
                            .padding(6)
                            .background(AppColors.accent)
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                    .disabled(viewModel.actionLoading || viewModel.restockAmount.isEmpty)

                    Button {
                        viewModel.restockingId = nil
                        viewModel.restockAmount = ""
                    } label: {
                        Image(systemName: "xmark")
                            .foregroundStyle(AppColors.textSecondary)
                            .padding(6)
                            .background(AppColors.borderLight)
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                }
                .font(.system(size: 14))
            } else {
                Button {
                    viewModel.restockingId = item.id
                    viewModel.restockAmount = ""
                } label: {
                    Text("Restock")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(AppColors.accent)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
    }

    private func stockBadge(_ status: StockStatus) -> some View {
        Text(status.label)
            .font(.system(size: 12, weight: .medium))
            .padding(.horizontal, 12)
            .padding(.vertical, 4)
            .background(stockBadgeBackground(status))
            .foregroundStyle(stockBadgeForeground(status))
            .clipShape(Capsule())
            .overlay(Capsule().stroke(stockBadgeBorder(status), lineWidth: 1))
    }

    private func stockBadgeBackground(_ status: StockStatus) -> Color {
        switch status {
        case .inStock: return AppColors.success.opacity(0.2)
        case .lowStock: return AppColors.warning.opacity(0.2)
        case .outOfStock: return AppColors.accent.opacity(0.2)
        }
    }

    private func stockBadgeForeground(_ status: StockStatus) -> Color {
        switch status {
        case .inStock: return AppColors.successLight
        case .lowStock: return AppColors.warningLight
        case .outOfStock: return AppColors.accentLight
        }
    }

    private func stockBadgeBorder(_ status: StockStatus) -> Color {
        switch status {
        case .inStock: return Color(hex: 0x166534)
        case .lowStock: return Color(hex: 0x92400E)
        case .outOfStock: return Color(hex: 0x991B1B)
        }
    }

    // MARK: - Summary

    private var summaryCards: some View {
        HStack(spacing: 16) {
            summaryCard("Total Items", "\(viewModel.totalItems)", .white)
            summaryCard("Low Stock", "\(viewModel.lowStockCount)", AppColors.warningLight)
            summaryCard("Out of Stock", "\(viewModel.outOfStockCount)", AppColors.accentLight)
        }
        .cardStyle()
        .padding(.vertical, 0)
    }

    private func summaryCard(_ label: String, _ value: String, _ color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 14))
                .foregroundStyle(AppColors.textSecondary)
            Text(value)
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(AppColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Placeholders

    private var loadingPlaceholder: some View {
        VStack(spacing: 12) {
            ForEach(0..<5, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 8)
                    .fill(AppColors.surface)
                    .frame(height: 80)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "shippingbox")
                .font(.system(size: 40))
                .foregroundStyle(AppColors.textMuted)
            Text("No items found")
                .foregroundStyle(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(48)
        .cardStyle()
    }
}
