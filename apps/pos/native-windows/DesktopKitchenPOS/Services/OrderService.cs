using DesktopKitchenPOS.Models;
using DesktopKitchenPOS.Networking.Endpoints;

namespace DesktopKitchenPOS.Services;

public class OrderService
{
    public async Task<List<Order>> GetOrdersAsync(string? status = null)
    {
        var path = status != null ? $"{OrderEndpoints.Orders}?status={status}" : OrderEndpoints.Orders;
        return await DesktopKitchenPOS.App.Api.RequestAsync<List<Order>>(HttpMethod.Get, path);
    }

    public async Task<Order> GetOrderAsync(int id)
    {
        return await DesktopKitchenPOS.App.Api.RequestAsync<Order>(HttpMethod.Get, OrderEndpoints.Order(id));
    }

    public async Task<Order> CreateOrderAsync(int employeeId, List<CreateOrderItem> items)
    {
        var request = new CreateOrderRequest { EmployeeId = employeeId, Items = items };
        return await DesktopKitchenPOS.App.Api.RequestAsync<Order>(HttpMethod.Post, OrderEndpoints.Create, request);
    }

    public async Task UpdateStatusAsync(int id, string status)
    {
        await DesktopKitchenPOS.App.Api.RequestVoidAsync(
            HttpMethod.Put, OrderEndpoints.UpdateStatus(id), new { status });
    }

    public async Task<List<Order>> GetKitchenOrdersAsync()
    {
        return await DesktopKitchenPOS.App.Api.RequestAsync<List<Order>>(HttpMethod.Get, OrderEndpoints.KitchenActive);
    }
}
