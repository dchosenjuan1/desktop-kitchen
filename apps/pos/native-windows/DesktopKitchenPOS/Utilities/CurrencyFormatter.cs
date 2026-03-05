using System.Globalization;

namespace DesktopKitchenPOS.Utilities;

public static class CurrencyFormatter
{
    public const double TaxRate = 0.16;
    public const string TaxLabel = "IVA (16%)";

    private static readonly CultureInfo MxCulture = new("es-MX");

    public static string Format(double amount)
    {
        return amount.ToString("C2", MxCulture);
    }

    public static string FormatShort(double amount)
    {
        return $"${amount:F2}";
    }

    /// <summary>
    /// Extract IVA from a tax-inclusive total (Mexican pricing).
    /// </summary>
    public static double ExtractTax(double fromTotal)
    {
        return Math.Round(fromTotal - fromTotal / (1 + TaxRate), 2);
    }

    /// <summary>
    /// Extract the pre-tax subtotal from a tax-inclusive total.
    /// </summary>
    public static double ExtractSubtotal(double fromTotal)
    {
        return Math.Round(fromTotal / (1 + TaxRate), 2);
    }
}
