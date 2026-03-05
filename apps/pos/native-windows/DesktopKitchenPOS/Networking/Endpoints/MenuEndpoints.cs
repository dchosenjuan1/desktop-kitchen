namespace DesktopKitchenPOS.Networking.Endpoints;

public static class MenuEndpoints
{
    public const string Categories = "/menu/categories";
    public const string Items = "/menu/items";
    public static string ItemsByCategory(int categoryId) => $"/menu/items?category_id={categoryId}";
}
