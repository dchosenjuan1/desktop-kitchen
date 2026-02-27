import SwiftUI

struct POSScreen: View {
    @Environment(AppState.self) private var appState
    @State private var vm = POSViewModel()

    var body: some View {
        ZStack {
            AppColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                // Top toolbar
                toolbar

                Divider().background(AppColors.border)

                // Horizontal category pills
                categoryPills

                Divider().background(AppColors.border)

                // Delivery orders banner (Phase 3)
                if !vm.deliveryOrders.isEmpty {
                    deliveryBanner
                }

                // Main content: menu grid + cart
                HStack(spacing: 0) {
                    menuGrid
                    cartPanel
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
        .task { await vm.loadData() }
        .onDisappear { vm.stopPolling() }
        .sheet(isPresented: Bindable(vm).showModifierSheet) {
            if let item = vm.modifierItem {
                ModifierSheet(item: item, groups: vm.modifierGroups) { selectedIds in
                    vm.addToCartWithModifiers(item: item, selectedModifierIds: selectedIds)
                }
            }
        }
        .sheet(isPresented: Bindable(vm).showPaymentSheet) {
            PaymentSheet(vm: vm, employeeId: appState.currentEmployee?.id ?? 0)
        }
        .sheet(isPresented: Bindable(vm).showSplitSheet) {
            if let orderId = vm.splitOrderId {
                SplitPaymentSheet(total: vm.total, orderId: orderId) {
                    vm.onSplitPaymentComplete()
                }
            }
        }
        .sheet(isPresented: Bindable(vm).showCustomerLookup) {
            CustomerLookupSheet { customer in
                vm.linkCustomer(customer)
            }
        }
        .sheet(isPresented: Bindable(vm).showOrderHistory) {
            OrderHistorySheet()
        }
    }

    // MARK: - Toolbar

    private var toolbar: some View {
        HStack(spacing: 12) {
            navMenu

            // Search
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

            // Running till total
            HStack(spacing: 6) {
                Image(systemName: "banknote")
                    .foregroundStyle(AppColors.success)
                VStack(alignment: .trailing, spacing: 0) {
                    Text(CurrencyFormatter.formatShort(vm.tillTotal))
                        .font(AppFonts.headline)
                        .foregroundStyle(.white)
                    if vm.tillOrderCount > 0 {
                        Text("\(vm.tillOrderCount) orders")
                            .font(AppFonts.caption)
                            .foregroundStyle(AppColors.textTertiary)
                    }
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(AppColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            // Held orders badge
            if !vm.heldOrders.isEmpty {
                Button { vm.showHeldOrdersPopover = true } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "pause.circle.fill")
                            .foregroundStyle(AppColors.warning)
                        Text("\(vm.heldOrders.count)")
                            .font(AppFonts.headline)
                            .foregroundStyle(.white)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(AppColors.warning.opacity(0.15))
                    .clipShape(Capsule())
                }
                .popover(isPresented: Bindable(vm).showHeldOrdersPopover) {
                    heldOrdersPopover
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
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
            Button { vm.showOrderHistory = true } label: {
                Label("Order History", systemImage: "clock")
            }
            Button { appState.navigate(to: .kitchen) } label: {
                Label("Kitchen Display", systemImage: "flame")
            }
            Divider()
            Button(role: .destructive) { appState.logout() } label: {
                Label("Logout", systemImage: "rectangle.portrait.and.arrow.right")
            }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "line.3.horizontal")
                    .font(.system(size: 16, weight: .medium))
                Text(appState.currentEmployee?.name ?? "POS")
                    .font(AppFonts.headline)
                    .lineLimit(1)
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(AppColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    // MARK: - Category Pills

    private var categoryPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Button { vm.selectedCategoryId = nil } label: {
                    Text("All")
                }
                .buttonStyle(CategoryPillStyle(isSelected: vm.selectedCategoryId == nil))

                ForEach(vm.categories) { cat in
                    Button { vm.selectedCategoryId = cat.id } label: {
                        Text(cat.name)
                    }
                    .buttonStyle(CategoryPillStyle(isSelected: vm.selectedCategoryId == cat.id))
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
    }

    // MARK: - Delivery Banner (Phase 3)

    private var deliveryBanner: some View {
        DeliveryOrdersBanner(deliveryOrders: vm.deliveryOrders)
    }

    // MARK: - Menu Grid

    private var menuGrid: some View {
        VStack(spacing: 0) {
            if vm.isLoading {
                Spacer()
                ProgressView().tint(.white)
                Spacer()
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: 12)], spacing: 12) {
                        ForEach(vm.filteredItems) { item in
                            menuItemCard(item)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
            }
        }
    }

    private func menuItemCard(_ item: MenuItem) -> some View {
        Button {
            vm.handleItemTap(item: item)
        } label: {
            VStack(spacing: 0) {
                // Image
                if let imageUrl = item.image_url, let url = URL(string: imageUrl) {
                    CachedAsyncImage(url: url, placeholderIcon: "fork.knife")
                        .frame(height: 90)
                        .frame(maxWidth: .infinity)
                        .clipped()
                } else {
                    ZStack {
                        AppColors.surface
                        Image(systemName: "fork.knife")
                            .font(.system(size: 24))
                            .foregroundStyle(AppColors.textMuted)
                    }
                    .frame(height: 90)
                    .frame(maxWidth: .infinity)
                }

                // Name + price + modifier badge
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 4) {
                        Text(item.name)
                            .font(AppFonts.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(.white)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)

                        if vm.itemHasModifiers(item.id) {
                            Image(systemName: "slider.horizontal.3")
                                .font(.system(size: 10))
                                .foregroundStyle(AppColors.textTertiary)
                        }
                    }

                    Text(CurrencyFormatter.format(item.price))
                        .font(AppFonts.subheadline)
                        .foregroundStyle(AppColors.accentLight)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
            }
            .cardStyle()
        }
        .buttonStyle(.plain)
    }

    // MARK: - Cart Panel

    private var cartPanel: some View {
        VStack(spacing: 0) {
            // Cart header with hold button
            HStack {
                Text("Current Order")
                    .font(AppFonts.title3)
                    .foregroundStyle(.white)

                Spacer()

                if !vm.cartIsEmpty {
                    Button { vm.holdCurrentOrder() } label: {
                        Image(systemName: "pause.circle")
                            .font(.system(size: 20))
                            .foregroundStyle(AppColors.warning)
                    }
                    .frame(width: 44, height: 44)

                    Button { vm.clearCart() } label: {
                        Image(systemName: "trash")
                            .font(.system(size: 16))
                            .foregroundStyle(AppColors.error)
                    }
                    .frame(width: 44, height: 44)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)

            // Linked customer badge
            if let customer = vm.linkedCustomer {
                HStack(spacing: 6) {
                    Image(systemName: "person.crop.circle.fill")
                        .foregroundStyle(AppColors.accent)
                    Text(customer.name ?? customer.phone)
                        .font(AppFonts.subheadline)
                        .foregroundStyle(.white)
                        .lineLimit(1)

                    if let card = customer.activeCard {
                        Text("\(card.stamps_earned)/\(card.stamps_required)")
                            .font(AppFonts.caption)
                            .fontWeight(.bold)
                            .foregroundStyle(AppColors.warning)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(AppColors.warning.opacity(0.15))
                            .clipShape(Capsule())
                    }

                    Spacer()

                    Button { vm.unlinkCustomer() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(AppColors.textMuted)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 8)
            }

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
                VStack(spacing: 6) {
                    totalRow("Subtotal", CurrencyFormatter.format(vm.subtotal))

                    if vm.discountAmount > 0 {
                        HStack {
                            HStack(spacing: 4) {
                                Text(discountLabel)
                                    .font(AppFonts.subheadline)
                                    .foregroundStyle(AppColors.success)
                                Button { vm.clearDiscount() } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.system(size: 12))
                                        .foregroundStyle(AppColors.textMuted)
                                }
                            }
                            Spacer()
                            Text("-\(CurrencyFormatter.format(vm.discountAmount))")
                                .font(AppFonts.subheadline)
                                .foregroundStyle(AppColors.success)
                        }
                    }

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

                // Action buttons
                VStack(spacing: 8) {
                    HStack(spacing: 8) {
                        // Link customer
                        Button { vm.showCustomerLookup = true } label: {
                            Image(systemName: "person.crop.circle.badge.plus")
                                .font(.system(size: 16))
                        }
                        .buttonStyle(SecondaryButtonStyle())
                        .frame(width: 56)

                        // Discount
                        Button { vm.showDiscountPopover = true } label: {
                            Label("% Discount", systemImage: "percent")
                                .font(.system(size: 14, weight: .semibold))
                        }
                        .buttonStyle(SecondaryButtonStyle())
                        .popover(isPresented: Bindable(vm).showDiscountPopover) {
                            discountPopover
                        }
                    }

                    // Charge button
                    Button { vm.showPaymentSheet = true } label: {
                        Text("Charge \(CurrencyFormatter.format(vm.total))")
                    }
                    .buttonStyle(PrimaryButtonStyle())
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
        }
        .background(AppColors.card)
    }

    private var discountLabel: String {
        switch vm.discountType {
        case .none: return ""
        case .percent: return "Discount (\(Int(vm.discountValue))%)"
        case .fixed: return "Discount"
        }
    }

    private func cartItemRow(_ item: CartItem) -> some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.item_name)
                    .font(AppFonts.subheadline)
                    .foregroundStyle(.white)
                    .lineLimit(1)

                // Show selected modifiers
                if let modNames = item.selectedModifierNames, !modNames.isEmpty {
                    Text(modNames.joined(separator: ", "))
                        .font(AppFonts.caption)
                        .foregroundStyle(AppColors.accentLight)
                        .lineLimit(1)
                }

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

            // Quantity stepper — 36pt buttons with 44pt hit area
            HStack(spacing: 6) {
                Button { vm.updateQuantity(cartId: item.cart_id, quantity: item.quantity - 1) } label: {
                    Image(systemName: "minus")
                        .font(.system(size: 13, weight: .bold))
                        .frame(width: 36, height: 36)
                        .background(AppColors.surface)
                        .clipShape(Circle())
                }
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)

                Text("\(item.quantity)")
                    .font(AppFonts.headline)
                    .foregroundStyle(.white)
                    .frame(minWidth: 24)

                Button { vm.updateQuantity(cartId: item.cart_id, quantity: item.quantity + 1) } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 13, weight: .bold))
                        .frame(width: 36, height: 36)
                        .background(AppColors.surface)
                        .clipShape(Circle())
                }
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)
            }

            Text(CurrencyFormatter.formatShort(item.lineTotal))
                .font(AppFonts.headline)
                .foregroundStyle(.white)
                .frame(width: 70, alignment: .trailing)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .contentShape(Rectangle())
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

    // MARK: - Discount Popover

    private var discountPopover: some View {
        VStack(spacing: 12) {
            Text("Quick Discount")
                .font(AppFonts.headline)
                .foregroundStyle(.white)
                .padding(.top, 8)

            let presets: [(String, DiscountType, Double)] = [
                ("5%", .percent, 5),
                ("10%", .percent, 10),
                ("15%", .percent, 15),
                ("20%", .percent, 20),
            ]

            HStack(spacing: 8) {
                ForEach(presets, id: \.0) { preset in
                    Button {
                        vm.applyDiscount(type: preset.1, value: preset.2)
                    } label: {
                        Text(preset.0)
                            .font(AppFonts.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(.white)
                            .frame(width: 56, height: 44)
                            .background(AppColors.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }

            if vm.discountAmount > 0 {
                Button {
                    vm.clearDiscount()
                } label: {
                    Text("Clear Discount")
                        .font(AppFonts.caption)
                        .foregroundStyle(AppColors.error)
                }
            }
        }
        .padding(16)
        .frame(width: 280)
        .background(AppColors.card)
    }

    // MARK: - Held Orders Popover

    private var heldOrdersPopover: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Held Orders")
                .font(AppFonts.headline)
                .foregroundStyle(.white)
                .padding(16)

            Divider().background(AppColors.border)

            ScrollView {
                VStack(spacing: 0) {
                    ForEach(vm.heldOrders) { held in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("\(held.items.count) item\(held.items.count == 1 ? "" : "s") — \(CurrencyFormatter.formatShort(held.items.reduce(0) { $0 + $1.lineTotal }))")
                                    .font(AppFonts.subheadline)
                                    .foregroundStyle(.white)

                                if let name = held.customerName {
                                    Text(name)
                                        .font(AppFonts.caption)
                                        .foregroundStyle(AppColors.accent)
                                }

                                Text(DateFormatters.timeOnly.string(from: held.timestamp))
                                    .font(AppFonts.caption)
                                    .foregroundStyle(AppColors.textTertiary)
                            }

                            Spacer()

                            Button {
                                vm.recallOrder(held)
                            } label: {
                                Text("Recall")
                                    .font(AppFonts.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(AppColors.accent)
                            }
                            .frame(height: 44)

                            Button {
                                vm.deleteHeldOrder(held)
                            } label: {
                                Image(systemName: "trash")
                                    .font(.system(size: 14))
                                    .foregroundStyle(AppColors.error)
                            }
                            .frame(width: 44, height: 44)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)

                        Divider().background(AppColors.border)
                    }
                }
            }
            .frame(maxHeight: 300)
        }
        .frame(width: 340)
        .background(AppColors.card)
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

// MARK: - Payment Sheet (2-tap design)

private struct PaymentSheet: View {
    let vm: POSViewModel
    let employeeId: Int
    @Environment(\.dismiss) private var dismiss

    @State private var selectedTip: TipOption = .none

    enum TipOption: Hashable {
        case none, ten, fifteen, twenty, custom
    }

    @State private var customTipPercent = ""

    private var tipPercent: Double {
        switch selectedTip {
        case .none: return 0
        case .ten: return 10
        case .fifteen: return 15
        case .twenty: return 20
        case .custom: return Double(customTipPercent) ?? 0
        }
    }

    private var tip: Double {
        vm.total * tipPercent / 100
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.background.ignoresSafeArea()

                VStack(spacing: 20) {
                    // Total display
                    VStack(spacing: 4) {
                        Text("Total")
                            .font(AppFonts.subheadline)
                            .foregroundStyle(AppColors.textSecondary)
                        Text(CurrencyFormatter.format(vm.total + tip))
                            .font(AppFonts.price)
                            .foregroundStyle(.white)
                        if tip > 0 {
                            Text("Tip \(Int(tipPercent))% — \(CurrencyFormatter.format(tip))")
                                .font(AppFonts.caption)
                                .foregroundStyle(AppColors.accentLight)
                        }
                    }
                    .padding(.top, 16)

                    // Tip presets (percentage)
                    HStack(spacing: 8) {
                        tipPill("None", option: .none)
                        tipPill("10%", option: .ten)
                        tipPill("15%", option: .fifteen)
                        tipPill("20%", option: .twenty)
                        tipPill("Custom", option: .custom)
                    }
                    .padding(.horizontal, 20)

                    if selectedTip == .custom {
                        HStack(spacing: 8) {
                            TextField("Tip %", text: $customTipPercent)
                                .keyboardType(.decimalPad)
                                .font(AppFonts.title3)
                                .foregroundStyle(.white)
                                .padding(12)
                                .background(AppColors.surface)
                                .clipShape(RoundedRectangle(cornerRadius: 10))

                            Text("%")
                                .font(AppFonts.title3)
                                .foregroundStyle(AppColors.textSecondary)
                        }
                        .padding(.horizontal, 20)
                    }

                    Spacer()

                    // Big payment buttons
                    VStack(spacing: 12) {
                        Button {
                            Task {
                                await vm.processCashPayment(employeeId: employeeId, tip: tip)
                                if !vm.isProcessingPayment { dismiss() }
                            }
                        } label: {
                            if vm.isProcessingPayment {
                                ProgressView().tint(.white)
                            } else {
                                VStack(spacing: 4) {
                                    Image(systemName: "banknote.fill")
                                        .font(.system(size: 28))
                                    Text("Cash")
                                        .font(.system(size: 18, weight: .bold))
                                }
                            }
                        }
                        .buttonStyle(PaymentMethodButtonStyle(color: AppColors.success))
                        .disabled(vm.isProcessingPayment)

                        Button {
                            Task {
                                await vm.processCardPayment(employeeId: employeeId, tip: tip)
                                if !vm.isProcessingPayment { dismiss() }
                            }
                        } label: {
                            if vm.isProcessingPayment {
                                ProgressView().tint(.white)
                            } else {
                                VStack(spacing: 4) {
                                    Image(systemName: "creditcard.fill")
                                        .font(.system(size: 28))
                                    Text("Card")
                                        .font(.system(size: 18, weight: .bold))
                                }
                            }
                        }
                        .buttonStyle(PaymentMethodButtonStyle(color: AppColors.info))
                        .disabled(vm.isProcessingPayment)

                        // Split button
                        Button {
                            Task {
                                await vm.startSplitPayment(employeeId: employeeId)
                                dismiss()
                            }
                        } label: {
                            Label("Split Payment", systemImage: "divide")
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
        .presentationDetents([.fraction(0.55)])
    }

    private func tipPill(_ label: String, option: TipOption) -> some View {
        Button { selectedTip = option } label: {
            Text(label)
        }
        .buttonStyle(TipPillStyle(isSelected: selectedTip == option))
    }
}
