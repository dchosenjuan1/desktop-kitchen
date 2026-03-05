namespace DesktopKitchenPOS.Networking.Endpoints;

public static class OrderEndpoints
{
    public const string Orders = "/orders";
    public static string Order(int id) => $"/orders/{id}";
    public const string Create = "/orders";
    public static string UpdateStatus(int id) => $"/orders/{id}/status";
    public const string KitchenActive = "/orders/kitchen/active";
}
