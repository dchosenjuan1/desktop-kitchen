using DesktopKitchenPOS.Models;
using DesktopKitchenPOS.Networking.Endpoints;

namespace DesktopKitchenPOS.Services;

public class ReportService
{
    public async Task<SalesReport> GetSalesAsync(string period)
    {
        return await DesktopKitchenPOS.App.Api.RequestAsync<SalesReport>(
            HttpMethod.Get, ReportEndpoints.Sales(period));
    }

    public async Task<List<TopItemsReport>> GetTopItemsAsync(string period, int limit = 10)
    {
        return await DesktopKitchenPOS.App.Api.RequestAsync<List<TopItemsReport>>(
            HttpMethod.Get, ReportEndpoints.TopItems(period, limit));
    }

    public async Task<List<HourlyReport>> GetHourlyAsync()
    {
        return await DesktopKitchenPOS.App.Api.RequestAsync<List<HourlyReport>>(
            HttpMethod.Get, ReportEndpoints.Hourly);
    }

    public async Task<LiveDashboardData> GetLiveAsync()
    {
        return await DesktopKitchenPOS.App.Api.RequestAsync<LiveDashboardData>(
            HttpMethod.Get, ReportEndpoints.Live);
    }
}
