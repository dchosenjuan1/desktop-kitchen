import Foundation

enum MenuService {
    static func getCategories() async throws -> [MenuCategory] {
        try await APIClient.shared.request(MenuEndpoints.getCategories())
    }

    static func getMenuItems(categoryId: Int? = nil) async throws -> [MenuItem] {
        try await APIClient.shared.request(MenuEndpoints.getMenuItems(categoryId: categoryId))
    }

    static func toggleItem(id: Int) async throws {
        try await APIClient.shared.requestVoid(MenuEndpoints.toggleMenuItem(id: id))
    }

    static func createItem(categoryId: Int, name: String, price: Double, description: String?) async throws -> MenuItem {
        try await APIClient.shared.request(
            MenuEndpoints.createMenuItem(data: CreateMenuItemRequest(
                category_id: categoryId,
                name: name,
                price: price,
                description: description
            ))
        )
    }

    static func updateItem(id: Int, categoryId: Int?, name: String?, price: Double?, description: String?) async throws -> MenuItem {
        try await APIClient.shared.request(
            MenuEndpoints.updateMenuItem(id: id, data: UpdateMenuItemRequest(
                category_id: categoryId,
                name: name,
                price: price,
                description: description
            ))
        )
    }
}
