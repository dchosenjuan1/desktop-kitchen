import SwiftUI

struct MenuManagementScreen: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = MenuManagementViewModel()

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                screenHeader(title: "Menu") {
                    appState.navigate(to: .admin)
                }
                Spacer()
                Button {
                    viewModel.openAddSheet()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "plus")
                        Text("Add Item")
                    }
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(AppColors.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .disabled(viewModel.selectedCategoryId == nil)
                .opacity(viewModel.selectedCategoryId == nil ? 0.5 : 1)
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

                    if viewModel.isLoading {
                        loadingPlaceholder
                    } else if viewModel.categories.isEmpty {
                        emptyCategories
                    } else {
                        // Category tabs
                        categoryTabs

                        // Menu items grid
                        if viewModel.menuItems.isEmpty {
                            emptyItems
                        } else {
                            menuItemsGrid
                        }
                    }
                }
                .padding(24)
            }
        }
        .background(AppColors.background)
        .task { await viewModel.loadCategories() }
        .sheet(isPresented: $viewModel.showSheet) {
            MenuItemFormSheet(viewModel: viewModel)
        }
    }

    // MARK: - Category Tabs

    private var categoryTabs: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Categories")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(.white)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(viewModel.categories) { category in
                        Button {
                            viewModel.selectCategory(category.id)
                        } label: {
                            Text(category.name)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(viewModel.selectedCategoryId == category.id ? .white : AppColors.textSecondary)
                                .padding(.horizontal, 24)
                                .padding(.vertical, 12)
                                .background(viewModel.selectedCategoryId == category.id ? AppColors.accent : AppColors.surface)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(viewModel.selectedCategoryId == category.id ? Color.clear : AppColors.borderLight, lineWidth: 1)
                                )
                        }
                    }
                }
            }
        }
        .padding(24)
        .cardStyle()
    }

    // MARK: - Menu Items Grid

    private var menuItemsGrid: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(viewModel.selectedCategoryName)
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(.white)

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 16),
                GridItem(.flexible(), spacing: 16),
                GridItem(.flexible(), spacing: 16),
            ], spacing: 16) {
                ForEach(viewModel.menuItems) { item in
                    menuItemCard(item)
                }
            }
        }
        .padding(24)
        .cardStyle()
    }

    private func menuItemCard(_ item: MenuItem) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.name)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(.white)
                    Text(CurrencyFormatter.formatShort(item.price))
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(AppColors.accentLight)
                }
                Spacer()
                Button {
                    Task { await viewModel.toggleItem(id: item.id) }
                } label: {
                    Image(systemName: item.active ? "togglepower" : "poweroff")
                        .font(.system(size: 20))
                        .foregroundStyle(item.active ? AppColors.successLight : AppColors.textTertiary)
                }
            }

            if let desc = item.description, !desc.isEmpty {
                Text(desc)
                    .font(.system(size: 14))
                    .foregroundStyle(AppColors.textSecondary)
                    .lineLimit(2)
            }

            Divider().background(AppColors.borderLight)

            HStack(spacing: 8) {
                Button {
                    viewModel.openEditSheet(item: item)
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "pencil")
                        Text("Edit")
                    }
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(AppColors.textSecondary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 40)
                    .background(AppColors.borderLight)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                Button {
                    Task { await viewModel.toggleItem(id: item.id) }
                } label: {
                    Text(item.active ? "Deactivate" : "Activate")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(item.active ? AppColors.accentLight : AppColors.successLight)
                        .frame(maxWidth: .infinity)
                        .frame(height: 40)
                        .background(item.active ? AppColors.accent.opacity(0.2) : AppColors.success.opacity(0.2))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(item.active ? Color(hex: 0x991B1B) : Color(hex: 0x166534), lineWidth: 1)
                        )
                }
            }
        }
        .padding(20)
        .background(item.active ? AppColors.surface : AppColors.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(item.active ? AppColors.borderLight : AppColors.border, lineWidth: 1)
        )
        .opacity(item.active ? 1 : 0.6)
    }

    // MARK: - Placeholders

    private var loadingPlaceholder: some View {
        VStack(spacing: 12) {
            ForEach(0..<5, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 12)
                    .fill(AppColors.card)
                    .frame(height: 64)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(AppColors.border, lineWidth: 1))
            }
        }
    }

    private var emptyCategories: some View {
        VStack(spacing: 12) {
            Image(systemName: "fork.knife")
                .font(.system(size: 40))
                .foregroundStyle(AppColors.textMuted)
            Text("No categories available")
                .foregroundStyle(AppColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(48)
        .cardStyle()
    }

    private var emptyItems: some View {
        VStack(spacing: 16) {
            Image(systemName: "fork.knife")
                .font(.system(size: 40))
                .foregroundStyle(AppColors.textMuted)
            Text("No items in \(viewModel.selectedCategoryName)")
                .foregroundStyle(AppColors.textSecondary)
            Button { viewModel.openAddSheet() } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus")
                    Text("Add First Item")
                }
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(AppColors.accent)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
        .frame(maxWidth: .infinity)
        .padding(48)
        .cardStyle()
    }
}

// MARK: - Menu Item Form Sheet

struct MenuItemFormSheet: View {
    @Bindable var viewModel: MenuManagementViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Item Name") {
                    TextField("e.g., Carne Asada Burrito", text: $viewModel.formName)
                    if let error = viewModel.formErrors["name"] {
                        Text(error).foregroundStyle(.red).font(.caption)
                    }
                }

                Section {
                    HStack {
                        VStack(alignment: .leading) {
                            Text("Price")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            HStack {
                                Text("$")
                                TextField("0.00", text: $viewModel.formPrice)
                                    .keyboardType(.decimalPad)
                            }
                            if let error = viewModel.formErrors["price"] {
                                Text(error).foregroundStyle(.red).font(.caption)
                            }
                        }

                        Divider()

                        VStack(alignment: .leading) {
                            Text("Category")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Picker("Category", selection: $viewModel.formCategoryId) {
                                Text("Select category").tag("")
                                ForEach(viewModel.categories) { cat in
                                    Text(cat.name).tag(String(cat.id))
                                }
                            }
                            .labelsHidden()
                            if let error = viewModel.formErrors["category"] {
                                Text(error).foregroundStyle(.red).font(.caption)
                            }
                        }
                    }
                }

                Section("Description (Optional)") {
                    TextEditor(text: $viewModel.formDescription)
                        .frame(height: 80)
                }
            }
            .navigationTitle(viewModel.sheetMode.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(viewModel.sheetMode == .add ? "Add Item" : "Save Changes") {
                        if viewModel.validateForm() {
                            dismiss()
                        }
                    }
                    .disabled(viewModel.actionLoading)
                    .fontWeight(.bold)
                }
            }
        }
    }
}
