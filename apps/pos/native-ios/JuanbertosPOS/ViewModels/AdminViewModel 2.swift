import Foundation

@Observable
final class AdminViewModel {
    var dailyStats: SalesReport?
    var lowStockItems: [InventoryItem] = []
    var isLoading = true
    var error: String?

    func loadData() async {
        isLoading = true
        do {
            async let stats = ReportService.getSales(period: "today")
            async let lowStock = InventoryService.getLowStock()
            dailyStats = try await stats
            lowStockItems = try await lowStock
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
