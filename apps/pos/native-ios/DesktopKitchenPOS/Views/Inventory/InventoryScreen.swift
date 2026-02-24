import SwiftUI

struct InventoryScreen: View {
    @Environment(AppState.self) private var appState
    @State private var vm = InventoryViewModel()

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

                    Text("Inventory")
                        .font(AppFonts.title2)
                        .foregroundStyle(.white)

                    Spacer()

                    // Stats
                    HStack(spacing: 16) {
                        statPill("\(vm.totalItems) items", AppColors.textTertiary)
                        if vm.lowStockCount > 0 {
                            statPill("\(vm.lowStockCount) low", AppColors.warning)
                        }
                        if vm.outOfStockCount > 0 {
                            statPill("\(vm.outOfStockCount) out", AppColors.error)
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 14)

                Divider().background(AppColors.border)

                // Toolbar
                HStack(spacing: 12) {
                    // Search
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundStyle(AppColors.textTertiary)
                        TextField("Search inventory...", text: Bindable(vm).searchTerm)
                            .foregroundStyle(.white)
                            .autocorrectionDisabled()
                    }
                    .padding(10)
                    .background(AppColors.card)
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                    // Category filter
                    Picker("Category", selection: Bindable(vm).selectedCategory) {
                        ForEach(vm.categories, id: \.self) { cat in
                            Text(cat == "all" ? "All Categories" : cat.capitalized).tag(cat)
                        }
                    }
                    .frame(width: 200)

                    // Sort
                    Picker("Sort", selection: Bindable(vm).sortBy) {
                        ForEach(InventorySortField.allCases, id: \.self) { field in
                            Text(field.label).tag(field)
                        }
                    }
                    .frame(width: 180)
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 10)

                Divider().background(AppColors.border)

                if vm.isLoading {
                    Spacer()
                    ProgressView().tint(.white)
                    Spacer()
                } else if vm.filteredItems.isEmpty {
                    Spacer()
                    Text("No inventory items found")
                        .font(AppFonts.subheadline)
                        .foregroundStyle(AppColors.textTertiary)
                    Spacer()
                } else {
                    // Inventory list
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(vm.filteredItems) { item in
                                inventoryRow(item)
                                Divider().background(AppColors.border)
                            }
                        }
                    }
                }

                if let error = vm.error {
                    Text(error)
                        .font(AppFonts.footnote)
                        .foregroundStyle(AppColors.error)
                        .padding(8)
                }
            }
        }
        .task { await vm.loadData() }
    }

    private func statPill(_ text: String, _ color: Color) -> some View {
        Text(text)
            .font(AppFonts.caption)
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.15))
            .clipShape(Capsule())
    }

    // MARK: - Inventory Row

    private func inventoryRow(_ item: InventoryItem) -> some View {
        HStack(spacing: 16) {
            // Status indicator
            Circle()
                .fill(stockColor(item.stockStatus))
                .frame(width: 10, height: 10)

            // Item info
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(AppFonts.subheadline)
                    .foregroundStyle(.white)
                Text(item.category.capitalized)
                    .font(AppFonts.caption)
                    .foregroundStyle(AppColors.textTertiary)
            }
            .frame(width: 200, alignment: .leading)

            // Quantity
            VStack(alignment: .leading, spacing: 2) {
                Text("\(item.quantity, specifier: "%.1f") \(item.unit)")
                    .font(AppFonts.subheadline)
                    .foregroundStyle(.white)
                Text("Threshold: \(item.low_stock_threshold, specifier: "%.1f")")
                    .font(AppFonts.caption)
                    .foregroundStyle(AppColors.textTertiary)
            }
            .frame(width: 150, alignment: .leading)

            // Status badge
            Text(item.stockStatus.label)
                .font(AppFonts.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(stockColor(item.stockStatus))
                .clipShape(Capsule())

            Spacer()

            // Restock
            if vm.restockingId == item.id {
                HStack(spacing: 8) {
                    TextField("Qty", text: Bindable(vm).restockAmount)
                        .keyboardType(.decimalPad)
                        .foregroundStyle(.white)
                        .frame(width: 60)
                        .padding(6)
                        .background(AppColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 6))

                    Button {
                        Task { await vm.restock() }
                    } label: {
                        Image(systemName: "checkmark")
                            .foregroundStyle(AppColors.success)
                    }
                    .disabled(vm.actionLoading)

                    Button {
                        vm.restockingId = nil
                        vm.restockAmount = ""
                    } label: {
                        Image(systemName: "xmark")
                            .foregroundStyle(AppColors.textTertiary)
                    }
                }
            } else {
                Button {
                    vm.restockingId = item.id
                    vm.restockAmount = ""
                } label: {
                    Text("Restock")
                        .font(AppFonts.caption)
                        .foregroundStyle(AppColors.info)
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
    }

    private func stockColor(_ status: StockStatus) -> Color {
        switch status {
        case .inStock: return AppColors.success
        case .lowStock: return AppColors.warning
        case .outOfStock: return AppColors.error
        }
    }
}
