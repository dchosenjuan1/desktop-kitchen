import Foundation

@Observable
final class InventoryViewModel {
    var items: [InventoryItem] = []
    var isLoading = true
    var error: String?
    var searchTerm = ""
    var selectedCategory = "all"
    var sortBy: InventorySortField = .name

    // Inline edit state
    var restockingId: Int?
    var restockAmount = ""
    var editingThresholdId: Int?
    var editThresholdValue = ""
    var actionLoading = false

    var categories: [String] {
        let cats = Set(items.map(\.category))
        return ["all"] + cats.sorted()
    }

    var filteredItems: [InventoryItem] {
        var result = items

        if !searchTerm.isEmpty {
            let query = searchTerm.lowercased()
            result = result.filter { $0.name.lowercased().contains(query) }
        }

        if selectedCategory != "all" {
            result = result.filter { $0.category == selectedCategory }
        }

        result.sort { a, b in
            switch sortBy {
            case .name: return a.name < b.name
            case .quantity: return a.quantity < b.quantity
            case .status:
                let aLow = a.quantity <= a.low_stock_threshold ? 0 : 1
                let bLow = b.quantity <= b.low_stock_threshold ? 0 : 1
                return aLow < bLow
            }
        }

        return result
    }

    var totalItems: Int { filteredItems.count }
    var lowStockCount: Int { filteredItems.filter { $0.quantity <= $0.low_stock_threshold && $0.quantity > 0 }.count }
    var outOfStockCount: Int { filteredItems.filter { $0.quantity <= 0 }.count }

    func loadData() async {
        isLoading = true
        do {
            items = try await InventoryService.getAll()
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func restock() async {
        guard let id = restockingId, let amount = Double(restockAmount), amount > 0 else {
            error = "Invalid restock amount"
            return
        }
        actionLoading = true
        do {
            try await InventoryService.restock(id: id, quantity: amount)
            await loadData()
            restockingId = nil
            restockAmount = ""
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
        actionLoading = false
    }

    func updateThreshold(id: Int) async {
        guard let threshold = Double(editThresholdValue), threshold >= 0 else {
            error = "Invalid threshold value"
            return
        }
        actionLoading = true
        do {
            try await InventoryService.updateThreshold(id: id, threshold: threshold)
            await loadData()
            editingThresholdId = nil
            editThresholdValue = ""
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
        actionLoading = false
    }
}

enum InventorySortField: String, CaseIterable {
    case name, quantity, status

    var label: String {
        switch self {
        case .name: return "Sort by Name"
        case .quantity: return "Sort by Quantity"
        case .status: return "Sort by Status"
        }
    }
}
