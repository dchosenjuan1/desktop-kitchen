using Windows.Storage;

namespace DesktopKitchenPOS.Configuration;

public class ServerConfig
{
    public static ServerConfig Shared { get; } = new();

    private const string BaseUrlKey = "server_base_url";
    private const string TenantKey = "tenant_id";
    private const string AdminSecretKey = "admin_secret";
    private const string DefaultUrl = "https://pos.desktop.kitchen";
    private const string DefaultTenant = "juanbertos";

    private readonly ApplicationDataContainer _settings;

    private ServerConfig()
    {
        _settings = ApplicationData.Current.LocalSettings;
    }

    public string BaseURL
    {
        get => StripApiPath(_settings.Values[BaseUrlKey] as string ?? DefaultUrl);
        set => _settings.Values[BaseUrlKey] = StripApiPath(value);
    }

    public string TenantID
    {
        get => _settings.Values[TenantKey] as string ?? DefaultTenant;
        set => _settings.Values[TenantKey] = value;
    }

    public string AdminSecret
    {
        get => _settings.Values[AdminSecretKey] as string ?? "";
        set => _settings.Values[AdminSecretKey] = value;
    }

    public void Reset()
    {
        BaseURL = DefaultUrl;
        TenantID = DefaultTenant;
        AdminSecret = "";
    }

    private static string StripApiPath(string url)
    {
        var u = url.TrimEnd('/');
        if (u.EndsWith("/api")) u = u[..^4];
        return u;
    }
}
