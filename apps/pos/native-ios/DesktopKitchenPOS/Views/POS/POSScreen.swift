import SwiftUI

struct POSScreen: View {
    @Environment(AppState.self) private var appState
    @State private var vm = POSViewModel()

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            HStack(spacing: 0) {
                // Left: Category sidebar
                categorySidebar
                    .frame(width: 180)

                // Center: Menu grid
                menuGrid

                // Right: Cart
                cartPanel
                    .frame(width: 340)
            }

            // Toasts
            VStack {
                ForEach(vm.toasts) { toast in
                    toastView(toast)
                        .transition(.move(edge: .top).combined(with: .opacity))
                }
                Spacer()
            }
            .padding(.top, 8)
            .animation(.spring(duration: 0.3), value: vm.toasts.count)
        }
        .task { await vm.loadData() }
    }

    // MARK: - Category Sidebar

    private var categorySidebar: some View {
        VStack(spacing: 0) {
            // Header with nav
            navMenu
                .padding(12)

            Divider().background(AppColors.border)

            ScrollView {
                LazyVStack(spacing: 0) {
                    Button { vm.selectedCategoryId = nil } label: {
                        Text("All Items")
                    }
                    .buttonStyle(CategoryButtonStyle(isSelected: vm.selectedCategoryId == nil))

                    ForEach(vm.categories) { cat in
                        Button { vm.selectedCategoryId = cat.id } label: {
                            Text(cat.name)
                        }
                        .buttonStyle(CategoryButtonStyle(isSelected: vm.selectedCategoryId == cat.id))
                    }
                }
            }
        }
        .background(AppColors.card)
    }

    private var navMenu: some View {
        Menu {
            if appState.currentEmployee?.role == .manager || appState.currentEmployee?.role == .admin {
                Button { appState.navigate(to: .admin) } label: {
                    Label("Dashboard", systemImage: "chart.bar")
                }
                Button { appState.navigate(to: .reports) } label: {
                    Label("Reports", systemImage: "doc.text")
                }
                Button { appState.navigate(to: .inventory) } label: {
                    Label("Inventory", systemImage: "shippingbox")
                }
                Button { appState.navigate(to: .employees) } label: {
                    Label("Employees", systemImage: "person.2")
                }
                Button { appState.navigate(to: .menuManagement) } label: {
                    Label("Menu", systemImage: "menucard")
                }
                Divider()
            }
            Button { appState.navigate(to: .kitchen) } label: {
                Label("Kitchen Display", systemImage: "flame")
            }
            Divider()
            Button(role: .destructive) { appState.logout() } label: {
                Label("Logout", systemImage: "rectangle.portrait.and.arrow.right")
            }
        } label: {
            HStack {
                Image(systemName: "line.3.horizontal")
                    .font(.system(size: 18, weight: .medium))
                Text(appState.currentEmployee?.name ?? "POS")
                    .font(AppFonts.headline)
                    .lineLimit(1)
                Spacer()
            }
            .foregroundStyle(.white)
            .padding(.vertical, 8)
        }
    }

    // MARK: - Menu Grid

    private var menuGrid: some View {
        VStack(spacing: 0) {
            // Search bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(AppColors.textTertiary)
                TextField("Search menu...", text: Bindable(vm).searchQuery)
                    .foregroundStyle(.white)
                    .autocorrectionDisabled()
                if !vm.searchQuery.isEmpty {
                    Button { vm.searchQuery = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(AppColors.textTertiary)
                    }
                }
            }
            .padding(12)
            .background(AppColors.card)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .padding(.horizontal, 16)
            .padding(.vertical, 12)

            if vm.isLoading {
                Spacer()
                ProgressView().tint(.white)
                Spacer()
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: 12)], spacing: 12) {
                        ForEach(vm.filteredItems) { item in
                            menuItemCard(item)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 16)
                }
            }
        }
    }

    private func menuItemCard(_ item: MenuItem) -> some View {
        Button {
            vm.addToCart(item: item)
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                Text(item.name)
                    .font(AppFonts.headline)
                    .foregroundStyle(.white)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                if let desc = item.description, !desc.isEmpty {
                    Text(desc)
                        .font(AppFonts.caption)
                        .foregroundStyle(AppColors.textTertiary)
                        .lineLimit(1)
                }

                Spacer(minLength: 0)

                Text(CurrencyFormatter.format(item.price))
                    .font(AppFonts.headline)
                    .foregroundStyle(AppColors.accentLight)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .frame(height: 110)
            .cardStyle()
        }
        .buttonStyle(.plain)
    }

    // MARK: - Cart Panel

    private var cartPanel: some View {
        VStack(spacing: 0) {
            // Cart header
            HStack {
                Text("Current Order")
                    .font(AppFonts.title3)
                    .foregroundStyle(.white)
                Spacer()
                if !vm.cartIsEmpty {
                    Button("Clear") { vm.clearCart() }
                        .font(AppFonts.footnote)
                        .foregroundStyle(AppColors.error)
                }
            }
            .padding(16)

            Divider().background(AppColors.border)

            if vm.cartIsEmpty {
                Spacer()
                VStack(spacing: 8) {
                    Image(systemName: "cart")
                        .font(.system(size: 40))
                        .foregroundStyle(AppColors.textMuted)
                    Text("Cart is empty")
                        .font(AppFonts.subheadline)
                        .foregroundStyle(AppColors.textTertiary)
                }
                Spacer()
            } else {
                // Cart items
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(vm.cart) { item in
                            cartItemRow(item)
                        }
                    }
                }

                Divider().background(AppColors.border)

                // Totals
                VStack(spacing: 8) {
                    totalRow("Subtotal", CurrencyFormatter.format(vm.subtotal))
                    totalRow(CurrencyFormatter.taxLabel, CurrencyFormatter.format(vm.tax))

                    Divider().background(AppColors.borderLight)

                    HStack {
                        Text("Total")
                            .font(AppFonts.title3)
                            .foregroundStyle(.white)
                        Spacer()
                        Text(CurrencyFormatter.format(vm.total))
                            .font(AppFonts.price)
                            .foregroundStyle(.white)
                    }
                }
                .padding(16)

                // Pay button
                Button { vm.showPaymentSheet = true } label: {
                    Text("Charge \(CurrencyFormatter.format(vm.total))")
                }
                .buttonStyle(PrimaryButtonStyle())
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
        }
        .background(AppColors.card)
        .sheet(isPresented: Bindable(vm).showPaymentSheet) {
            PaymentSheet(vm: vm, employeeId: appState.currentEmployee?.id ?? 0)
        }
    }

    private func cartItemRow(_ item: CartItem) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.item_name)
                    .font(AppFonts.subheadline)
                    .foregroundStyle(.white)
                    .lineLimit(1)
                Text(CurrencyFormatter.formatShort(item.unit_price))
                    .font(AppFonts.caption)
                    .foregroundStyle(AppColors.textTertiary)
                if let notes = item.notes {
                    Text(notes)
                        .font(AppFonts.caption)
                        .foregroundStyle(AppColors.warning)
                        .lineLimit(1)
                }
            }

            Spacer()

            // Quantity stepper
            HStack(spacing: 8) {
                Button { vm.updateQuantity(cartId: item.cart_id, quantity: item.quantity - 1) } label: {
                    Image(systemName: "minus")
                        .font(.system(size: 12, weight: .bold))
                        .frame(width: 28, height: 28)
                        .background(AppColors.surface)
                        .clipShape(Circle())
                }
                .foregroundStyle(.white)

                Text("\(item.quantity)")
                    .font(AppFonts.headline)
                    .foregroundStyle(.white)
                    .frame(minWidth: 24)

                Button { vm.updateQuantity(cartId: item.cart_id, quantity: item.quantity + 1) } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 12, weight: .bold))
                        .frame(width: 28, height: 28)
                        .background(AppColors.surface)
                        .clipShape(Circle())
                }
                .foregroundStyle(.white)
            }

            Text(CurrencyFormatter.formatShort(item.lineTotal))
                .font(AppFonts.headline)
                .foregroundStyle(.white)
                .frame(width: 70, alignment: .trailing)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .contextMenu {
            Button { vm.notesItem = item } label: {
                Label("Add Note", systemImage: "note.text")
            }
            Button(role: .destructive) { vm.removeFromCart(cartId: item.cart_id) } label: {
                Label("Remove", systemImage: "trash")
            }
        }
    }

    private func totalRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .font(AppFonts.subheadline)
                .foregroundStyle(AppColors.textSecondary)
            Spacer()
            Text(value)
                .font(AppFonts.subheadline)
                .foregroundStyle(AppColors.textSecondary)
        }
    }

    // MARK: - Toast

    private func toastView(_ toast: ToastMessage) -> some View {
        HStack(spacing: 8) {
            Image(systemName: toastIcon(toast.type))
            Text(toast.message)
                .font(AppFonts.subheadline)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(toastColor(toast.type).opacity(0.9))
        .clipShape(Capsule())
    }

    private func toastIcon(_ type: ToastType) -> String {
        switch type {
        case .success: return "checkmark.circle.fill"
        case .error: return "exclamationmark.circle.fill"
        case .info: return "info.circle.fill"
        }
    }

    private func toastColor(_ type: ToastType) -> Color {
        switch type {
        case .success: return AppColors.success
        case .error: return AppColors.error
        case .info: return AppColors.info
        }
    }
}

// MARK: - Payment Sheet

private struct PaymentSheet: View {
    let vm: POSViewModel
    let employeeId: Int
    @Environment(\.dismiss) private var dismiss
    @State private var tipAmount = ""

    private var tip: Double { Double(tipAmount) ?? 0 }

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()

                VStack(spacing: 24) {
                    // Order total
                    VStack(spacing: 4) {
                        Text("Total")
                            .font(AppFonts.subheadline)
                            .foregroundStyle(AppColors.textSecondary)
                        Text(CurrencyFormatter.format(vm.total + tip))
                            .font(AppFonts.price)
                            .foregroundStyle(.white)
                    }
                    .padding(.top, 20)

                    // Tip input
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Tip")
                            .font(AppFonts.subheadline)
                            .foregroundStyle(AppColors.textSecondary)
                        TextField("$0.00", text: $tipAmount)
                            .keyboardType(.decimalPad)
                            .font(AppFonts.title3)
                            .foregroundStyle(.white)
                            .padding(12)
                            .background(AppColors.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .padding(.horizontal, 20)

                    Spacer()

                    // Payment buttons
                    VStack(spacing: 12) {
                        Button {
                            Task {
                                await vm.processCashPayment(employeeId: employeeId, tip: tip)
                                dismiss()
                            }
                        } label: {
                            Label("Cash Payment", systemImage: "banknote")
                        }
                        .buttonStyle(PrimaryButtonStyle(isDisabled: vm.isProcessingPayment))
                        .disabled(vm.isProcessingPayment)

                        Button {
                            Task {
                                await vm.processCardPayment(employeeId: employeeId, tip: tip)
                                dismiss()
                            }
                        } label: {
                            Label("Card Payment", systemImage: "creditcard")
                        }
                        .buttonStyle(SecondaryButtonStyle())
                        .disabled(vm.isProcessingPayment)
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                }
            }
            .navigationTitle("Payment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(AppColors.textSecondary)
                }
            }
        }
        .presentationDetents([.medium])
    }
}
