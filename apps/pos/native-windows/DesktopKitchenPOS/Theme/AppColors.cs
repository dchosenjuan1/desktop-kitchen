using Microsoft.UI;
using Microsoft.UI.Xaml.Media;
using Windows.UI;

namespace DesktopKitchenPOS.Theme;

public static class AppColors
{
    // Backgrounds
    public static readonly Color Background = Color.FromArgb(255, 10, 10, 10);     // neutral-950
    public static readonly Color Card = Color.FromArgb(255, 23, 23, 23);            // neutral-900
    public static readonly Color CardHover = Color.FromArgb(255, 28, 28, 28);
    public static readonly Color Surface = Color.FromArgb(255, 38, 38, 38);         // neutral-800

    // Borders
    public static readonly Color Border = Color.FromArgb(255, 38, 38, 38);          // neutral-800
    public static readonly Color BorderLight = Color.FromArgb(255, 64, 64, 64);     // neutral-700

    // Accent — dynamically overridable via branding
    public static Color Accent = Color.FromArgb(255, 220, 38, 38);                  // red-600
    public static Color AccentDark = Color.FromArgb(255, 185, 28, 28);              // red-700
    public static Color AccentLight = Color.FromArgb(255, 239, 68, 68);             // red-500

    // Text
    public static readonly Color TextPrimary = Colors.White;
    public static readonly Color TextSecondary = Color.FromArgb(255, 163, 163, 163); // neutral-400
    public static readonly Color TextTertiary = Color.FromArgb(255, 115, 115, 115);  // neutral-500
    public static readonly Color TextMuted = Color.FromArgb(255, 82, 82, 82);        // neutral-600

    // Status
    public static readonly Color Success = Color.FromArgb(255, 22, 163, 74);         // green-600
    public static readonly Color SuccessLight = Color.FromArgb(255, 74, 222, 128);   // green-400
    public static readonly Color Warning = Color.FromArgb(255, 245, 158, 11);        // amber-500
    public static readonly Color WarningLight = Color.FromArgb(255, 251, 191, 36);   // amber-400
    public static readonly Color Error = Color.FromArgb(255, 220, 38, 38);           // red-600
    public static readonly Color Info = Color.FromArgb(255, 37, 99, 235);            // blue-600

    // Brushes (for XAML binding convenience)
    public static SolidColorBrush BackgroundBrush => new(Background);
    public static SolidColorBrush CardBrush => new(Card);
    public static SolidColorBrush SurfaceBrush => new(Surface);
    public static SolidColorBrush BorderBrush => new(Border);
    public static SolidColorBrush AccentBrush => new(Accent);
    public static SolidColorBrush TextPrimaryBrush => new(TextPrimary);
    public static SolidColorBrush TextSecondaryBrush => new(TextSecondary);
    public static SolidColorBrush TextTertiaryBrush => new(TextTertiary);
    public static SolidColorBrush SuccessBrush => new(Success);
    public static SolidColorBrush WarningBrush => new(Warning);
    public static SolidColorBrush ErrorBrush => new(Error);
    public static SolidColorBrush InfoBrush => new(Info);

    public static void ApplyBranding(string hex)
    {
        var color = ParseHex(hex);
        if (color == null) return;

        Accent = color.Value;
        AccentDark = Color.FromArgb(255,
            (byte)(color.Value.R * 0.8),
            (byte)(color.Value.G * 0.8),
            (byte)(color.Value.B * 0.8));
        AccentLight = Color.FromArgb(255,
            (byte)Math.Min(color.Value.R * 1.2, 255),
            (byte)Math.Min(color.Value.G * 1.2, 255),
            (byte)Math.Min(color.Value.B * 1.2, 255));
    }

    private static Color? ParseHex(string hex)
    {
        var cleaned = hex.TrimStart('#');
        if (cleaned.Length != 6) return null;
        if (!uint.TryParse(cleaned, System.Globalization.NumberStyles.HexNumber, null, out var value))
            return null;
        return Color.FromArgb(255,
            (byte)((value >> 16) & 0xFF),
            (byte)((value >> 8) & 0xFF),
            (byte)(value & 0xFF));
    }
}
