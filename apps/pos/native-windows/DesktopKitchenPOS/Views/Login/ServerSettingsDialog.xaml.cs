using Microsoft.UI.Xaml.Controls;
using DesktopKitchenPOS.Configuration;

namespace DesktopKitchenPOS.Views.Login;

public sealed partial class ServerSettingsDialog : ContentDialog
{
    public ServerSettingsDialog()
    {
        InitializeComponent();
        var config = ServerConfig.Shared;
        BaseUrlBox.Text = config.BaseURL;
        TenantIdBox.Text = config.TenantID;
        AdminSecretBox.Password = config.AdminSecret;
    }

    private void OnSave(ContentDialog sender, ContentDialogButtonClickEventArgs args)
    {
        var config = ServerConfig.Shared;
        config.BaseURL = BaseUrlBox.Text;
        config.TenantID = TenantIdBox.Text;
        config.AdminSecret = AdminSecretBox.Password;
    }
}
