import SwiftUI

struct KioskScreen: View {
    @Environment(AppState.self) private var appState
    @State private var vm = POSViewModel(isKioskMode: true)
    @State private var showExitSheet = false
    @State private var restaurantName: String = "Menu"

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                // Kiosk header
                kioskHeader

                Divider().background(AppColors.border)

                // Category pills
                CategoryPillsView(
                    categories: vm.categories,
                    selectedCategoryId: vm.selectedCategoryId,
                    onSelect: { vm.selectedCategoryId = $0 }
                )

                Divider().background(AppColors.border)

                // Main content: menu grid + cart
                HStack(spacing: 0) {
                    MenuGridView(
                        items: vm.filteredItems,
                        isLoading: vm.isLoading,
                        itemHasModifiers: { vm.itemHasModifiers($0) },
                        onItemTap: { vm.handleItemTap(item: $0) }
                    )

                    kioskCartPanel
                        .frame(width: 380)
                }
            }

            // Order confirmation overlay
            if vm.showOrderConfirmation {
                OrderConfirmationOverlay(
                    orderNumber: vm.confirmedOrderNumber,
                    onDismiss: { vm.dismissOrderConfirmation() }
                )
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
        .task {
            await vm.loadData()
            await loadRestaurantName()
        }
        .onDisappear { vm.stopPolling() }
        .sheet(isPresented: Bindable(vm).showModifierSheet) {
            if let item = vm.modifierItem {
                ModifierSheet(item: item, groups: vm.modifierGroups) { selectedIds in
                    vm.addToCartWithModifiers(item: item, selectedModifierIds: selectedIds)
                }
            }
        }
        .sheet(isPresented: Bindable(vm).showPaymentSheet) {
            PaymentSheet(
                vm: vm,
                employeeId: appState.kioskEmployeeId ?? 0,
                showSplitButton: false
            )
        }
        .sheet(isPresented: $showExitSheet) {
            KioskExitSheet()
        }
    }

    // MARK: - Kiosk Header

    private var kioskHeader: some View {
        HStack(spacing: 12) {
            // Restaurant name (centered visually by spacers)
            Spacer()

            // Search bar
            HStack(spacing: 8) {
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
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(AppColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .frame(maxWidth: 400)

            Spacer()

            // Restaurant name badge
            Text(restaurantName)
                .font(AppFonts.headline)
                .foregroundStyle(.white)

            Spacer()

            // Lock icon to exit kiosk
            Button { showExitSheet = true } label: {
                Image(systemName: "lock.fill")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(AppColors.textMuted)
                    .frame(width: 44, height: 44)
                    .background(AppColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    // MARK: - Kiosk Cart Panel

    private var kioskCartPanel: some View {
        VStack(spacing: 0) {
            // Cart header
            HStack {
                Text("Your Order")
                    .font(AppFonts.title3)
                    .foregroundStyle(.white)

                Spacer()

                if !vm.cartIsEmpty {
                    Button { vm.clearCart() } label: {
                        Text("Start Over")
                            .font(AppFonts.subheadline)
                            .foregroundStyle(AppColors.error)
                    }
                    .frame(height: 44)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)

            Divider().background(AppColors.border)

            if vm.cartIsEmpty {
                Spacer()
                VStack(spacing: 8) {
                    Image(systemName: "cart")
                        .font(.system(size: 40))
                        .foregroundStyle(AppColors.textMuted)
                    Text("Tap items to add them")
                        .font(AppFonts.subheadline)
                        .foregroundStyle(AppColors.textTertiary)
                }
                Spacer()
            } else {
                // Cart items
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(vm.cart) { item in
                            CartItemRow(
                                item: item,
                                onQuantityChange: { cartId, qty in
                                    vm.updateQuantity(cartId: cartId, quantity: qty)
                                },
                                onAddNote: { vm.notesItem = $0 },
                                onRemove: { vm.removeFromCart(cartId: $0) }
                            )
                        }
                    }
                }

                Divider().background(AppColors.border)

                // Totals (no discount row in kiosk)
                VStack(spacing: 6) {
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
                .padding(.horizontal, 16)
                .padding(.vertical, 12)

                // Pay button
                Button { vm.showPaymentSheet = true } label: {
                    Text("Pay \(CurrencyFormatter.format(vm.total))")
                }
                .buttonStyle(PrimaryButtonStyle())
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
        }
        .background(AppColors.card)
    }

    // MARK: - Helpers

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

    private func loadRestaurantName() async {
        do {
            let branding = try await BrandingService.getBranding()
            if let name = branding.restaurantName {
                restaurantName = name
            }
        } catch {
            // Keep default
        }
    }
}
