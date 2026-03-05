namespace DesktopKitchenPOS.Networking;

public static class AuthTokenStore
{
    private static string? _token;
    private static readonly object _lock = new();

    public static string? Token
    {
        get { lock (_lock) { return _token; } }
        set { lock (_lock) { _token = value; } }
    }
}
