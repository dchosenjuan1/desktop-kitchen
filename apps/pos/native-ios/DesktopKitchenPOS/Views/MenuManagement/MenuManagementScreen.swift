import SwiftUI

struct MenuManagementScreen: View {
    @Environment(AppState.self) private var appState
    @State private var vm = MenuManagementViewModel()

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

                    Text("Menu Management")
                        .font(AppFonts.title2)
                        .foregroundStyle(.white)

                    Spacer()

                    Button { vm.openAddSheet() } label: {
                        Label("Add Item", systemImage: "plus")
                            .font(AppFonts.headline)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(AppColors.accent)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 14)

                Divider().background(AppColors.border)

                HStack(spacing: 0) {
                    // Category sidebar
                    categorySidebar
                        .frame(width: 200)

                    Divider().background(AppColors.border)

                    // Items list
                    itemsList
                }
            }
        }
        .task { await vm.loadCategories() }
        .sheet(isPresented: Bindable(vm).showSheet) {
            itemFormSheet
        }
    }

    // MARK: - Category Sidebar

    private var categorySidebar: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(vm.categories) { cat in
                    Button { vm.selectCategory(cat.id) } label: {
                        HStack {
                            Text(cat.name)
                                .font(AppFonts.subheadline)
                                .foregroundStyle(vm.selectedCategoryId == cat.id ? .white : AppColors.textSecondary)
                            Spacer()
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .background(vm.selectedCategoryId == cat.id ? AppColors.accent.opacity(0.2) : Color.clear)
                    }
                    .buttonStyle(.plain)

                    Divider().background(AppColors.border)
                }
            }
        }
        .background(AppColors.card)
    }

    // MARK: - Items List

    private var itemsList: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                Spacer()
                ProgressView().tint(.white)
                Spacer()
            } else if vm.menuItems.isEmpty {
                Spacer()
                VStack(spacing: 8) {
                    Image(systemName: "menucard")
                        .font(.system(size: 40))
                        .foregroundStyle(AppColors.textMuted)
                    Text("No items in this category")
                        .font(AppFonts.subheadline)
                        .foregroundStyle(AppColors.textTertiary)
                }
                Spacer()
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(vm.menuItems) { item in
                            menuItemRow(item)
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

    private func menuItemRow(_ item: MenuItem) -> some View {
        HStack(spacing: 16) {
            // Active indicator
            Circle()
                .fill(item.active ? AppColors.success : AppColors.textMuted)
                .frame(width: 8, height: 8)

            // Item info
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(AppFonts.headline)
                    .foregroundStyle(item.active ? .white : AppColors.textMuted)

                if let desc = item.description, !desc.isEmpty {
                    Text(desc)
                        .font(AppFonts.caption)
                        .foregroundStyle(AppColors.textTertiary)
                        .lineLimit(1)
                }
            }

            Spacer()

            // Price
            Text(CurrencyFormatter.format(item.price))
                .font(AppFonts.headline)
                .foregroundStyle(AppColors.accentLight)

            // Actions
            Button { vm.openEditSheet(item: item) } label: {
                Image(systemName: "pencil")
                    .foregroundStyle(AppColors.info)
            }

            Button {
                Task { await vm.toggleItem(id: item.id) }
            } label: {
                Image(systemName: item.active ? "eye.slash" : "eye")
                    .foregroundStyle(item.active ? AppColors.warning : AppColors.success)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
    }

    // MARK: - Item Form Sheet

    private var itemFormSheet: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()

                VStack(spacing: 20) {
                    // Name
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Item Name")
                            .font(AppFonts.subheadline)
                            .foregroundStyle(AppColors.textSecondary)
                        TextField("e.g. Tacos al Pastor", text: Bindable(vm).formName)
                            .foregroundStyle(.white)
                            .padding(12)
                            .background(AppColors.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        if let err = vm.formErrors["name"] {
                            Text(err).font(AppFonts.caption).foregroundStyle(AppColors.error)
                        }
                    }

                    // Price
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Price (MXN)")
                            .font(AppFonts.subheadline)
                            .foregroundStyle(AppColors.textSecondary)
                        TextField("0.00", text: Bindable(vm).formPrice)
                            .keyboardType(.decimalPad)
                            .foregroundStyle(.white)
                            .padding(12)
                            .background(AppColors.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        if let err = vm.formErrors["price"] {
                            Text(err).font(AppFonts.caption).foregroundStyle(AppColors.error)
                        }
                    }

                    // Description
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Description (optional)")
                            .font(AppFonts.subheadline)
                            .foregroundStyle(AppColors.textSecondary)
                        TextField("Brief description", text: Bindable(vm).formDescription)
                            .foregroundStyle(.white)
                            .padding(12)
                            .background(AppColors.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }

                    // Category picker
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Category")
                            .font(AppFonts.subheadline)
                            .foregroundStyle(AppColors.textSecondary)
                        Picker("Category", selection: Bindable(vm).formCategoryId) {
                            Text("Select...").tag("")
                            ForEach(vm.categories) { cat in
                                Text(cat.name).tag(String(cat.id))
                            }
                        }
                        if let err = vm.formErrors["category"] {
                            Text(err).font(AppFonts.caption).foregroundStyle(AppColors.error)
                        }
                    }

                    Spacer()

                    Button {
                        Task {
                            // Save not implemented in VM yet but form validates
                            _ = vm.validateForm()
                        }
                    } label: {
                        Text(vm.sheetMode.title)
                    }
                    .buttonStyle(PrimaryButtonStyle(isDisabled: vm.actionLoading))
                    .disabled(vm.actionLoading)
                }
                .padding(20)
            }
            .navigationTitle(vm.sheetMode.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { vm.showSheet = false }
                        .foregroundStyle(AppColors.textSecondary)
                }
            }
        }
        .presentationDetents([.medium])
    }
}
