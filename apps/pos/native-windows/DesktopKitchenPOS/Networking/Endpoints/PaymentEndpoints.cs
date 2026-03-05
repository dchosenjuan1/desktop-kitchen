namespace DesktopKitchenPOS.Networking.Endpoints;

public static class PaymentEndpoints
{
    public const string CreateIntent = "/payments/create-intent";
    public const string Confirm = "/payments/confirm";
    public const string Cash = "/payments/cash";
    public static string Status(int orderId) => $"/payments/{orderId}";
}
