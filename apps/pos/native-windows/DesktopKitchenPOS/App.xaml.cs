using Microsoft.UI.Xaml;
using DesktopKitchenPOS.App;
using DesktopKitchenPOS.Networking;
using DesktopKitchenPOS.Services;
using DesktopKitchenPOS.Theme;

namespace DesktopKitchenPOS;

public partial class App : Application
{
    public static AppState State { get; } = new();
    public static ApiClient Api { get; } = new();

    // Services (singleton instances)
    public static AuthService AuthService { get; } = new();
    public static MenuService MenuService { get; } = new();
    public static OrderService OrderService { get; } = new();
    public static PaymentService PaymentService { get; } = new();
    public static ReportService ReportService { get; } = new();
    public static BrandingService BrandingService { get; } = new();
    public static ModifierService ModifierService { get; } = new();

    private Window? _window;

    public App()
    {
        InitializeComponent();
    }

    protected override async void OnLaunched(LaunchActivatedEventArgs args)
    {
        _window = new MainWindow();
        _window.Activate();

        // Load branding in background
        try
        {
            var branding = await BrandingService.GetBrandingAsync();
            if (!string.IsNullOrEmpty(branding?.PrimaryColor))
            {
                AppColors.ApplyBranding(branding.PrimaryColor);
            }
        }
        catch
        {
            // Branding is optional — use defaults
        }
    }
}
