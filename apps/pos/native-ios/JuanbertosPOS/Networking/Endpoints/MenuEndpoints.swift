import Foundation

enum MenuEndpoints {
    static func getCategories() -> Endpoint {
        Endpoint(path: "/menu/categories")
    }

    static func getMenuItems(categoryId: Int? = nil) -> Endpoint {
        var queryItems: [URLQueryItem]? = nil
        if let categoryId {
            queryItems = [URLQueryItem(name: "category_id", value: String(categoryId))]
        }
        return Endpoint(path: "/menu/items", queryItems: queryItems)
    }

    static func toggleMenuItem(id: Int) -> Endpoint {
        Endpoint(path: "/menu/items/\(id)/toggle", method: .put)
    }
}
