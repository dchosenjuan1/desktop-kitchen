import SwiftUI

struct POSScreen: View {
    @Environment(AppState.self) private var appState
    @State private var viewModel = POSViewModel()
    @State private var currentTime = Date()

    private let timer = Timer.publish(every: 60, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            if viewModel.isLoading {
                loadingView
            } else {
                mainContent
            }

            // Toast overlay
            toastOverlay
        }
        .background(AppColors.background)
        .task { await viewModel.loadData() }
        .onReceive(timer) { currentTime = $0 }
        .sheet(item: $viewModel.notesItem) { item in
            NotesSheet(item: item) { notes in
                viewModel.updateNotes(cartId: item.cart_id, notes: notes)
            }
        }
        .sheet(isPresented: $viewModel.showPaymentSheet) {
            PaymentSheet(
                orderTotal: viewModel.total,
                isProcessing: viewModel.isProcessingPayment
            ) { tip, method in
                Task {
                    guard let employeeId = appState.currentEmployee?.id else { return }
                    switch method {
                    case .card:
                        await viewModel.processCardPayment(employeeId: employeeId, tip: tip)
                    case .cash:
                        await viewModel.processCashPayment(employeeId: employeeId, tip: tip)
                    case .split:
                        break // Split payment handled separately
                    }
                }
            }
        }
        .sheet(isPresented: $viewModel.showReceiptSheet) {
            if let order = viewModel.completedOrder {
                ReceiptSheet(order: order) {
                    viewModel.showReceiptSheet = false
                    viewModel.completedOrder = nil
                }
            }
        }
    }

    // MARK: - Main Content

    private var mainContent: some View {
        HStack(spacing: 0) {
            // Left sidebar — Categories (192pt)
            CategorySidebar(
                categories: viewModel.categories,
                selectedId: $viewModel.selectedCategoryId,
                onAdminTap: { appState.navigate(to: .admin) },
                onKitchenTap: { appState.navigate(to: .kitchen) }
            )
            .frame(width: 192)

            // Center — Menu items (flex)
            MenuItemGrid(
                items: viewModel.filteredItems,
                employeeName: appState.currentEmployee?.name ?? "",
                currentTime: currentTime,
                searchQuery: $viewModel.searchQuery,
                onItemTap: { viewModel.addToCart(item: $0) }
            )

            // Right sidebar — Cart (384pt)
            CartSidebar(
                cart: viewModel.cart,
                subtotal: viewModel.subtotal,
                tax: viewModel.tax,
                total: viewModel.total,
                onUpdateQuantity: { cartId, qty in viewModel.updateQuantity(cartId: cartId, quantity: qty) },
                onRemove: { viewModel.removeFromCart(cartId: $0) },
                onNotesTap: { viewModel.notesItem = $0 },
                onCharge: { viewModel.showPaymentSheet = true },
                onClear: { viewModel.clearCart() },
                onLogout: { appState.logout() }
            )
            .frame(width: 384)
        }
    }

    // MARK: - Loading

    private var loadingView: some View {
        VStack(spacing: 16) {
            Image("Logo")
                .resizable()
                .scaledToFit()
                .frame(height: 64)
            Text("Loading menu...")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)
            ProgressView()
                .tint(AppColors.accent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppColors.background)
    }

    // MARK: - Toast Overlay

    private var toastOverlay: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                VStack(spacing: 8) {
                    ForEach(viewModel.toasts) { toast in
                        Text(toast.message)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                            .background(toastColor(toast.type))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .transition(.move(edge: .trailing).combined(with: .opacity))
                    }
                }
                .padding(16)
                .animation(.easeInOut, value: viewModel.toasts.count)
            }
        }
    }

    private func toastColor(_ type: ToastType) -> Color {
        switch type {
        case .success: return AppColors.success
        case .error: return AppColors.accent
        case .info: return AppColors.borderLight
        }
    }
}
