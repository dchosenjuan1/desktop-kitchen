import Foundation

@Observable
final class MenuManagementViewModel {
    var categories: [MenuCategory] = []
    var menuItems: [MenuItem] = []
    var selectedCategoryId: Int?
    var isLoading = true
    var error: String?
    var actionLoading = false

    // Sheet state
    var showSheet = false
    var sheetMode: SheetMode = .add
    var editingId: Int?

    // Form
    var formName = ""
    var formPrice = ""
    var formDescription = ""
    var formCategoryId = ""
    var formErrors: [String: String] = [:]

    var selectedCategoryName: String {
        guard let id = selectedCategoryId else { return "Unknown" }
        return categories.first(where: { $0.id == id })?.name ?? "Unknown"
    }

    func loadCategories() async {
        isLoading = true
        do {
            categories = try await MenuService.getCategories()
            if selectedCategoryId == nil, let first = categories.first {
                selectedCategoryId = first.id
            }
            if let catId = selectedCategoryId {
                await loadItems(categoryId: catId)
            }
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func loadItems(categoryId: Int) async {
        do {
            menuItems = try await MenuService.getMenuItems(categoryId: categoryId)
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    func selectCategory(_ id: Int) {
        selectedCategoryId = id
        Task { await loadItems(categoryId: id) }
    }

    func toggleItem(id: Int) async {
        do {
            try await MenuService.toggleItem(id: id)
            if let catId = selectedCategoryId {
                await loadItems(categoryId: catId)
            }
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    func openAddSheet() {
        formName = ""
        formPrice = ""
        formDescription = ""
        formCategoryId = selectedCategoryId.map(String.init) ?? ""
        formErrors = [:]
        editingId = nil
        sheetMode = .add
        showSheet = true
    }

    func openEditSheet(item: MenuItem) {
        formName = item.name
        formPrice = String(item.price)
        formDescription = item.description ?? ""
        formCategoryId = String(item.category_id)
        formErrors = [:]
        editingId = item.id
        sheetMode = .edit
        showSheet = true
    }

    func validateForm() -> Bool {
        formErrors = [:]
        if formName.trimmingCharacters(in: .whitespaces).isEmpty {
            formErrors["name"] = "Item name is required"
        }
        if formPrice.isEmpty {
            formErrors["price"] = "Price is required"
        } else if Double(formPrice) == nil || (Double(formPrice) ?? -1) < 0 {
            formErrors["price"] = "Price must be a valid number"
        }
        if formCategoryId.isEmpty {
            formErrors["category"] = "Category is required"
        }
        return formErrors.isEmpty
    }

    enum SheetMode {
        case add, edit
        var title: String {
            switch self {
            case .add: return "Add Menu Item"
            case .edit: return "Edit Menu Item"
            }
        }
    }
}
