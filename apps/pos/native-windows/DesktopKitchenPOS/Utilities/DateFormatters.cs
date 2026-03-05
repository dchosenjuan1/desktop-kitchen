using System.Globalization;

namespace DesktopKitchenPOS.Utilities;

public static class DateFormatters
{
    public static DateTime? ParseISO(string? dateString)
    {
        if (string.IsNullOrEmpty(dateString)) return null;
        if (DateTime.TryParse(dateString, CultureInfo.InvariantCulture,
            DateTimeStyles.RoundtripKind, out var dt))
            return dt.ToUniversalTime();
        return null;
    }

    public static int ElapsedSeconds(string? dateString)
    {
        var dt = ParseISO(dateString);
        if (dt == null) return 0;
        return (int)(DateTime.UtcNow - dt.Value).TotalSeconds;
    }

    public static string FormatElapsed(int seconds)
    {
        var mins = seconds / 60;
        var secs = seconds % 60;
        return mins > 0 ? $"{mins}m {secs}s" : $"{secs}s";
    }

    public static string FormatTime(string? dateString)
    {
        var dt = ParseISO(dateString);
        if (dt == null) return "";
        var local = dt.Value.ToLocalTime();
        var hour = local.Hour % 12 == 0 ? 12 : local.Hour % 12;
        var ampm = local.Hour < 12 ? "AM" : "PM";
        return $"{hour}:{local.Minute:D2} {ampm}";
    }
}
