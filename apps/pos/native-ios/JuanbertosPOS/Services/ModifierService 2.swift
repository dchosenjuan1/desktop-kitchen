import Foundation

enum ModifierService {
    static func getGroups() async throws -> [ModifierGroup] {
        try await APIClient.shared.request(ModifierEndpoints.getGroups())
    }

    static func getGroupsForItem(menuItemId: Int) async throws -> [ModifierGroup] {
        try await APIClient.shared.request(ModifierEndpoints.getGroupsForItem(menuItemId: menuItemId))
    }

    static func createGroup(name: String, selectionType: String, required: Bool? = nil, minSelections: Int? = nil, maxSelections: Int? = nil) async throws -> ModifierGroup {
        let request = CreateModifierGroupRequest(
            name: name,
            selection_type: selectionType,
            required: required,
            min_selections: minSelections,
            max_selections: maxSelections
        )
        return try await APIClient.shared.request(ModifierEndpoints.createGroup(data: request))
    }

    static func updateGroup(id: Int, name: String? = nil, selectionType: String? = nil, required: Bool? = nil, active: Bool? = nil) async throws {
        let request = UpdateModifierGroupRequest(
            name: name,
            selection_type: selectionType,
            required: required,
            active: active
        )
        try await APIClient.shared.requestVoid(ModifierEndpoints.updateGroup(id: id, data: request))
    }

    static func createModifier(groupId: Int, name: String, priceAdjustment: Double) async throws {
        let request = CreateModifierRequest(group_id: groupId, name: name, price_adjustment: priceAdjustment)
        try await APIClient.shared.requestVoid(ModifierEndpoints.createModifier(data: request))
    }

    static func updateModifier(id: Int, name: String? = nil, priceAdjustment: Double? = nil, active: Bool? = nil) async throws {
        let request = UpdateModifierRequest(name: name, price_adjustment: priceAdjustment, active: active)
        try await APIClient.shared.requestVoid(ModifierEndpoints.updateModifier(id: id, data: request))
    }

    static func assignGroupToItem(menuItemId: Int, groupId: Int) async throws {
        try await APIClient.shared.requestVoid(ModifierEndpoints.assignGroupToItem(menuItemId: menuItemId, groupId: groupId))
    }

    static func removeGroupFromItem(menuItemId: Int, groupId: Int) async throws {
        try await APIClient.shared.requestVoid(ModifierEndpoints.removeGroupFromItem(menuItemId: menuItemId, groupId: groupId))
    }
}
