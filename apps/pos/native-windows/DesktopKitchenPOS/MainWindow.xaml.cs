using Microsoft.UI.Xaml;

namespace DesktopKitchenPOS;

public sealed partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        Title = "Desktop Kitchen POS";
        ExtendsContentIntoTitleBar = true;
    }
}
