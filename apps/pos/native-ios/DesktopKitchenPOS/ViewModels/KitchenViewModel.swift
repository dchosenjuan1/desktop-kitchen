import SwiftUI
import AVFoundation

@Observable @MainActor
final class KitchenViewModel {
    var orders: [Order] = []
    var isLoading = true
    var error: String?
    var currentTime = Date()

    private var lastPendingCount = 0
    private var pollingTask: Task<Void, Never>?
    private var timeTask: Task<Void, Never>?

    var pendingCount: Int {
        orders.filter { $0.status == .pending }.count
    }

    func startPolling() {
        pollingTask = Task { @MainActor [weak self] in
            guard let self else { return }
            await self.fetchOrders()
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(5))
                guard !Task.isCancelled else { break }
                await self.fetchOrders()
            }
        }

        timeTask = Task { @MainActor [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                guard !Task.isCancelled else { break }
                self?.currentTime = Date()
            }
        }
    }

    func stopPolling() {
        pollingTask?.cancel()
        timeTask?.cancel()
    }

    func fetchOrders() async {
        do {
            let data = try await OrderService.getKitchenOrders()

            let activeOrders = data
                .filter { $0.status != .completed && $0.status != .cancelled }
                .sorted { a, b in
                    let statusRank: [OrderStatus: Int] = [.pending: 0, .preparing: 1]
                    let aRank = statusRank[a.status] ?? 2
                    let bRank = statusRank[b.status] ?? 2
                    if aRank != bRank { return aRank < bRank }
                    return a.created_at > b.created_at
                }

            let newPendingCount = activeOrders.filter { $0.status == .pending }.count
            if newPendingCount > lastPendingCount {
                playAlert()
            }
            lastPendingCount = newPendingCount

            orders = activeOrders
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func startOrder(id: Int) async {
        do {
            try await OrderService.updateStatus(id: id, status: "preparing")
            await fetchOrders()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func markReady(id: Int) async {
        do {
            try await OrderService.updateStatus(id: id, status: "ready")
            await fetchOrders()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func elapsedSeconds(for order: Order) -> Int {
        guard let created = DateFormatters.parseISO(order.created_at) else { return 0 }
        return Int(currentTime.timeIntervalSince(created))
    }

    func isUrgent(_ order: Order) -> Bool {
        elapsedSeconds(for: order) > 600
    }

    private func playAlert() {
        AudioServicesPlaySystemSound(1007) // tri-tone alert
    }
}
