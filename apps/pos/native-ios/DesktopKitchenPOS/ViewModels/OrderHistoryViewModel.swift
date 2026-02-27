import SwiftUI

@Observable @MainActor
final class OrderHistoryViewModel {
    var orders: [Order] = []
    var isLoading = true
    var selectedFilter: String? = nil // nil = All
    var error: String?

    private var pollingTask: Task<Void, Never>?

    let filterOptions: [(label: String, value: String?)] = [
        ("All", nil),
        ("Pending", "pending"),
        ("Ready", "ready"),
        ("Completed", "completed"),
    ]

    var filteredOrders: [Order] {
        guard let filter = selectedFilter else { return orders }
        return orders.filter { $0.status.rawValue == filter }
    }

    func startPolling() {
        pollingTask = Task { @MainActor [weak self] in
            guard let self else { return }
            await self.fetchOrders()
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(10))
                guard !Task.isCancelled else { break }
                await self.fetchOrders()
            }
        }
    }

    func stopPolling() {
        pollingTask?.cancel()
    }

    private func fetchOrders() async {
        do {
            orders = try await OrderService.getOrders()
                .sorted { ($0.created_at ?? "") > ($1.created_at ?? "") }
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
