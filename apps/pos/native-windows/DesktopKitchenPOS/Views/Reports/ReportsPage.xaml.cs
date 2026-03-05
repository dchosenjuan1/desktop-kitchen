using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using DesktopKitchenPOS.ViewModels;
using DesktopKitchenPOS.Theme;
using DesktopKitchenPOS.Utilities;

namespace DesktopKitchenPOS.Views.Reports;

public sealed partial class ReportsPage : UserControl
{
    private readonly ReportsViewModel _vm = new();

    public ReportsPage()
    {
        InitializeComponent();
        _vm.PropertyChanged += OnViewModelChanged;
        UpdatePeriodButtons();
        _ = _vm.LoadDataCommand.ExecuteAsync(null);
    }

    private void OnViewModelChanged(object? sender, System.ComponentModel.PropertyChangedEventArgs e)
    {
        DispatcherQueue.TryEnqueue(() =>
        {
            switch (e.PropertyName)
            {
                case nameof(ReportsViewModel.IsLoading):
                    LoadingRing.IsActive = _vm.IsLoading;
                    ContentGrid.Visibility = _vm.IsLoading ? Visibility.Collapsed : Visibility.Visible;
                    break;
                case nameof(ReportsViewModel.SalesData):
                    UpdateKPIs();
                    break;
                case nameof(ReportsViewModel.TopItems):
                    UpdateTopItems();
                    break;
                case nameof(ReportsViewModel.Period):
                    UpdatePeriodButtons();
                    break;
            }
        });
    }

    private void UpdateKPIs()
    {
        var s = _vm.SalesData;
        RevenueValue.Text = CurrencyFormatter.Format(s?.TotalRevenue ?? 0);
        OrdersValue.Text = $"{s?.OrderCount ?? 0}";
        AvgTicketValue.Text = CurrencyFormatter.Format(s?.AvgTicket ?? 0);
        TipsValue.Text = CurrencyFormatter.Format(s?.TipTotal ?? 0);
    }

    private void UpdateTopItems()
    {
        TopItemsList.Items.Clear();
        NoDataText.Visibility = _vm.TopItems.Count == 0 ? Visibility.Visible : Visibility.Collapsed;

        for (var i = 0; i < _vm.TopItems.Count; i++)
        {
            var item = _vm.TopItems[i];
            var row = new Grid
            {
                Background = new SolidColorBrush(AppColors.Card),
                CornerRadius = new CornerRadius(8),
                Padding = new Thickness(12),
                Margin = new Thickness(0, 0, 0, 4)
            };

            var left = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
            left.Children.Add(new TextBlock
            {
                Text = $"{i + 1}.",
                FontSize = 14, FontWeight = Microsoft.UI.Text.FontWeights.SemiBold,
                Foreground = AppColors.TextTertiaryBrush,
                VerticalAlignment = VerticalAlignment.Center
            });
            var nameStack = new StackPanel();
            nameStack.Children.Add(new TextBlock
            {
                Text = item.ItemName,
                FontSize = 14,
                Foreground = AppColors.TextPrimaryBrush
            });
            nameStack.Children.Add(new TextBlock
            {
                Text = $"{item.QuantitySold} sold",
                FontSize = 12,
                Foreground = AppColors.TextTertiaryBrush
            });
            left.Children.Add(nameStack);
            row.Children.Add(left);

            row.Children.Add(new TextBlock
            {
                Text = CurrencyFormatter.Format(item.Revenue),
                FontSize = 14,
                Foreground = AppColors.AccentBrush,
                HorizontalAlignment = HorizontalAlignment.Right,
                VerticalAlignment = VerticalAlignment.Center
            });

            TopItemsList.Items.Add(row);
        }
    }

    private void UpdatePeriodButtons()
    {
        var accent = new SolidColorBrush(AppColors.Accent);
        var card = new SolidColorBrush(AppColors.Card);
        TodayBtn.Background = _vm.Period == ReportPeriod.Today ? accent : card;
        WeekBtn.Background = _vm.Period == ReportPeriod.Week ? accent : card;
        MonthBtn.Background = _vm.Period == ReportPeriod.Month ? accent : card;
        TodayBtn.Foreground = AppColors.TextPrimaryBrush;
        WeekBtn.Foreground = AppColors.TextPrimaryBrush;
        MonthBtn.Foreground = AppColors.TextPrimaryBrush;
    }

    private async void OnPeriodClick(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is string tag)
        {
            var period = tag switch
            {
                "Week" => ReportPeriod.Week,
                "Month" => ReportPeriod.Month,
                _ => ReportPeriod.Today
            };
            await _vm.ChangePeriodCommand.ExecuteAsync(period);
        }
    }

    private void OnBackClick(object sender, RoutedEventArgs e)
    {
        DesktopKitchenPOS.App.State.Navigate(App.Screen.POS);
    }
}
