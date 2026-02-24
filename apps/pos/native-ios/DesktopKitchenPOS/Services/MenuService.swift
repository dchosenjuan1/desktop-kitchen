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
}
