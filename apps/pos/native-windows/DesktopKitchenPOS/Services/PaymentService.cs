using DesktopKitchenPOS.Models;
using DesktopKitchenPOS.Networking.Endpoints;

namespace DesktopKitchenPOS.Services;

public class PaymentService
{
    public async Task<PaymentIntent> CreateIntentAsync(int orderId, double? tip = null)
    {
        return await DesktopKitchenPOS.App.Api.RequestAsync<PaymentIntent>(
            HttpMethod.Post, PaymentEndpoints.CreateIntent,
            new CreatePaymentIntentRequest { OrderId = orderId, Tip = tip });
    }

    public async Task ConfirmAsync(int orderId, string paymentIntentId)
    {
        await DesktopKitchenPOS.App.Api.RequestVoidAsync(
            HttpMethod.Post, PaymentEndpoints.Confirm,
            new ConfirmPaymentRequest { OrderId = orderId, PaymentIntentId = paymentIntentId });
    }

    public async Task CashPaymentAsync(int orderId, double? tip = null)
    {
        await DesktopKitchenPOS.App.Api.RequestVoidAsync(
            HttpMethod.Post, PaymentEndpoints.Cash,
            new CashPaymentRequest { OrderId = orderId, Tip = tip });
    }

    public async Task<PaymentStatus> GetStatusAsync(int orderId)
    {
        return await DesktopKitchenPOS.App.Api.RequestAsync<PaymentStatus>(
            HttpMethod.Get, PaymentEndpoints.Status(orderId));
    }
}
