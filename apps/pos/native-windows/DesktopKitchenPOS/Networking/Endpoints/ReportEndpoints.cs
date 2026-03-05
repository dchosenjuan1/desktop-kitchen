namespace DesktopKitchenPOS.Networking.Endpoints;

public static class ReportEndpoints
{
    public static string Sales(string period) => $"/reports/sales?period={period}";
    public static string TopItems(string period, int limit = 10) => $"/reports/top-items?period={period}&limit={limit}";
    public const string Hourly = "/reports/hourly";
    public const string Live = "/reports/live";
}
