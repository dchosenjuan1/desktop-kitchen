namespace DesktopKitchenPOS.Networking.Endpoints;

public static class ModifierEndpoints
{
    public static string GroupsForItem(int menuItemId) => $"/modifiers/item/{menuItemId}";
}
