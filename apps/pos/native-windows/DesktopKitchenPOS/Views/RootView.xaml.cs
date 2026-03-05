using Microsoft.UI.Xaml.Controls;
using DesktopKitchenPOS.App;
using DesktopKitchenPOS.Views.Login;
using DesktopKitchenPOS.Views.POS;
using DesktopKitchenPOS.Views.Kitchen;
using DesktopKitchenPOS.Views.Reports;

namespace DesktopKitchenPOS.Views;

public sealed partial class RootView : UserControl
{
    private readonly AppState _appState;

    public RootView()
    {
        InitializeComponent();
        _appState = DesktopKitchenPOS.App.State;
        _appState.PropertyChanged += OnAppStateChanged;
        NavigateToCurrentScreen();
    }

    private void OnAppStateChanged(object? sender, System.ComponentModel.PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(AppState.CurrentScreen))
        {
            DispatcherQueue.TryEnqueue(NavigateToCurrentScreen);
        }
    }

    private void NavigateToCurrentScreen()
    {
        RootContainer.Children.Clear();

        UserControl view = _appState.CurrentScreen switch
        {
            Screen.Login => new LoginPage(),
            Screen.POS => new POSPage(),
            Screen.Kitchen => new KitchenPage(),
            Screen.Reports => new ReportsPage(),
            _ => new POSPage() // Fallback for unimplemented screens
        };

        RootContainer.Children.Add(view);
    }
}
