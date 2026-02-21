import Foundation

enum ModifierEndpoints {
    static func getGroups() -> Endpoint {
        Endpoint(path: "/modifiers/groups")
    }

    static func getGroupsForItem(menuItemId: Int) -> Endpoint {
        Endpoint(path: "/modifiers/groups/item/\(menuItemId)")
    }

    static func createGroup(data: CreateModifierGroupRequest) -> Endpoint {
        Endpoint(path: "/modifiers/groups", method: .post, body: data)
    }

    static func updateGroup(id: Int, data: UpdateModifierGroupRequest) -> Endpoint {
        Endpoint(path: "/modifiers/groups/\(id)", method: .put, body: data)
    }

    static func createModifier(data: CreateModifierRequest) -> Endpoint {
        Endpoint(path: "/modifiers", method: .post, body: data)
    }

    static func updateModifier(id: Int, data: UpdateModifierRequest) -> Endpoint {
        Endpoint(path: "/modifiers/\(id)", method: .put, body: data)
    }

    static func assignGroupToItem(menuItemId: Int, groupId: Int) -> Endpoint {
        struct Body: Encodable { let menu_item_id: Int; let modifier_group_id: Int }
        return Endpoint(
            path: "/modifiers/assign",
            method: .post,
            body: Body(menu_item_id: menuItemId, modifier_group_id: groupId)
        )
    }

    static func removeGroupFromItem(menuItemId: Int, groupId: Int) -> Endpoint {
        struct Body: Encodable { let menu_item_id: Int; let modifier_group_id: Int }
        return Endpoint(
            path: "/modifiers/unassign",
            method: .post,
            body: Body(menu_item_id: menuItemId, modifier_group_id: groupId)
        )
    }
}

struct CreateModifierGroupRequest: Codable, Sendable {
    var name: String
    var selection_type: String
    var required: Bool?
    var min_selections: Int?
    var max_selections: Int?
}

struct UpdateModifierGroupRequest: Codable, Sendable {
    var name: String?
    var selection_type: String?
    var required: Bool?
    var min_selections: Int?
    var max_selections: Int?
    var active: Bool?
}

struct CreateModifierRequest: Codable, Sendable {
    var group_id: Int
    var name: String
    var price_adjustment: Double
}

struct UpdateModifierRequest: Codable, Sendable {
    var name: String?
    var price_adjustment: Double?
    var active: Bool?
}
