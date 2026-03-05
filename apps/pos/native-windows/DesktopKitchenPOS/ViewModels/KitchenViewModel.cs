using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using DesktopKitchenPOS.Models;
using DesktopKitchenPOS.Utilities;

namespace DesktopKitchenPOS.ViewModels;

public partial class KitchenViewModel : ObservableObject
{
    [ObservableProperty]
    private List<Order> _orders = new();

    [ObservableProperty]
    private bool _isLoading = true;

    [ObservableProperty]
    private string? _error;

    private PeriodicTimer? _pollingTimer;
    private PeriodicTimer? _clockTimer;
    private CancellationTokenSource? _cts;

    public int PendingCount => Orders.Count(o => o.Status == "pending");

    public void StartPolling()
    {
        StopPolling();
        _cts = new CancellationTokenSource();

        _ = PollOrdersAsync(_cts.Token);
        _ = PollClockAsync(_cts.Token);
    }

    public void StopPolling()
    {
        _cts?.Cancel();
        _pollingTimer?.Dispose();
        _clockTimer?.Dispose();
    }

    private async Task PollOrdersAsync(CancellationToken ct)
    {
        await FetchOrdersAsync();
        _pollingTimer = new PeriodicTimer(TimeSpan.FromSeconds(5));
        while (await _pollingTimer.WaitForNextTickAsync(ct))
        {
            await FetchOrdersAsync();
        }
    }

    private async Task PollClockAsync(CancellationToken ct)
    {
        _clockTimer = new PeriodicTimer(TimeSpan.FromSeconds(1));
        while (await _clockTimer.WaitForNextTickAsync(ct))
        {
            // Force UI to refresh elapsed times
            OnPropertyChanged(nameof(Orders));
        }
    }

    private async Task FetchOrdersAsync()
    {
        try
        {
            var data = await DesktopKitchenPOS.App.OrderService.GetKitchenOrdersAsync();
            var statusRank = new Dictionary<string, int>
            {
                ["pending"] = 0, ["preparing"] = 1, ["confirmed"] = 2
            };
            Orders = data
                .Where(o => o.Status is not "completed" and not "cancelled")
                .OrderBy(o => statusRank.GetValueOrDefault(o.Status, 3))
                .ThenByDescending(o => o.CreatedAt ?? "")
                .ToList();
            Error = null;
            OnPropertyChanged(nameof(PendingCount));
        }
        catch (Exception ex)
        {
            Error = ex.Message;
        }
        IsLoading = false;
    }

    [RelayCommand]
    public async Task StartOrderAsync(int id)
    {
        try
        {
            await DesktopKitchenPOS.App.OrderService.UpdateStatusAsync(id, "preparing");
            await FetchOrdersAsync();
        }
        catch (Exception ex)
        {
            Error = ex.Message;
        }
    }

    [RelayCommand]
    public async Task MarkReadyAsync(int id)
    {
        try
        {
            await DesktopKitchenPOS.App.OrderService.UpdateStatusAsync(id, "ready");
            await FetchOrdersAsync();
        }
        catch (Exception ex)
        {
            Error = ex.Message;
        }
    }

    public int ElapsedSeconds(Order order) => DateFormatters.ElapsedSeconds(order.CreatedAt);

    public bool IsUrgent(Order order) => ElapsedSeconds(order) > 600;
}
