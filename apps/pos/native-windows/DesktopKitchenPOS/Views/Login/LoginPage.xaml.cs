using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Shapes;
using DesktopKitchenPOS.ViewModels;
using DesktopKitchenPOS.Theme;

namespace DesktopKitchenPOS.Views.Login;

public sealed partial class LoginPage : UserControl
{
    private readonly LoginViewModel _vm = new();

    public LoginPage()
    {
        InitializeComponent();
        _vm.PropertyChanged += OnViewModelChanged;
        _vm.LoginSucceeded += OnLoginSucceeded;
        UpdateDots();
    }

    private void OnViewModelChanged(object? sender, System.ComponentModel.PropertyChangedEventArgs e)
    {
        DispatcherQueue.TryEnqueue(() =>
        {
            UpdateDots();
            ErrorText.Text = _vm.Error ?? "";
            ErrorText.Visibility = _vm.Error != null ? Visibility.Visible : Visibility.Collapsed;
            LoadingRing.IsActive = _vm.IsLoading;
        });
    }

    private void UpdateDots()
    {
        PinDotsPanel.Children.Clear();
        foreach (var filled in _vm.Dots)
        {
            var dot = new Ellipse
            {
                Width = 20,
                Height = 20,
                Fill = new SolidColorBrush(filled ? AppColors.Accent : AppColors.Surface)
            };
            PinDotsPanel.Children.Add(dot);
        }
    }

    private void OnLoginSucceeded(Models.Employee employee)
    {
        DispatcherQueue.TryEnqueue(() =>
        {
            DesktopKitchenPOS.App.State.LoginSucceeded(employee);
        });
    }

    private async void OnDigitClick(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is string digit)
        {
            await _vm.AppendDigitCommand.ExecuteAsync(digit);
        }
    }

    private void OnBackspaceClick(object sender, RoutedEventArgs e)
    {
        _vm.BackspaceCommand.Execute(null);
    }

    private void OnClearClick(object sender, RoutedEventArgs e)
    {
        _vm.ClearCommand.Execute(null);
    }

    private async void OnSettingsClick(object sender, RoutedEventArgs e)
    {
        var dialog = new ServerSettingsDialog
        {
            XamlRoot = this.XamlRoot
        };
        await dialog.ShowAsync();
    }
}
