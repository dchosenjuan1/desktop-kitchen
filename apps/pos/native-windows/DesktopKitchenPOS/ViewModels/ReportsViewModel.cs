using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using DesktopKitchenPOS.Models;

namespace DesktopKitchenPOS.ViewModels;

public enum ReportPeriod
{
    Today,
    Week,
    Month
}

public partial class ReportsViewModel : ObservableObject
{
    [ObservableProperty]
    private ReportPeriod _period = ReportPeriod.Today;

    [ObservableProperty]
    private SalesReport? _salesData;

    [ObservableProperty]
    private List<TopItemsReport> _topItems = new();

    [ObservableProperty]
    private List<HourlyReport> _hourlyData = new();

    [ObservableProperty]
    private bool _isLoading = true;

    [ObservableProperty]
    private string? _error;

    public string PeriodValue => Period switch
    {
        ReportPeriod.Today => "today",
        ReportPeriod.Week => "week",
        ReportPeriod.Month => "month",
        _ => "today"
    };

    public string PeriodLabel => Period switch
    {
        ReportPeriod.Today => "Today",
        ReportPeriod.Week => "This Week",
        ReportPeriod.Month => "This Month",
        _ => "Today"
    };

    [RelayCommand]
    public async Task LoadDataAsync()
    {
        IsLoading = true;
        Error = null;
        try
        {
            var salesTask = DesktopKitchenPOS.App.ReportService.GetSalesAsync(PeriodValue);
            var itemsTask = DesktopKitchenPOS.App.ReportService.GetTopItemsAsync(PeriodValue, 10);
            var hourlyTask = DesktopKitchenPOS.App.ReportService.GetHourlyAsync();

            SalesData = await salesTask;
            TopItems = await itemsTask;
            HourlyData = await hourlyTask;
        }
        catch (Exception ex)
        {
            Error = ex.Message;
        }
        IsLoading = false;
    }

    [RelayCommand]
    public async Task ChangePeriodAsync(ReportPeriod newPeriod)
    {
        Period = newPeriod;
        await LoadDataAsync();
    }
}
