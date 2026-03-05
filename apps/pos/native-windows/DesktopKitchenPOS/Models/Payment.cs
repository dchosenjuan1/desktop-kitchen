using System.Text.Json.Serialization;

namespace DesktopKitchenPOS.Models;

public record PaymentIntent
{
    [JsonPropertyName("client_secret")]
    public string ClientSecret { get; init; } = "";

    [JsonPropertyName("payment_intent_id")]
    public string PaymentIntentId { get; init; } = "";

    [JsonPropertyName("amount")]
    public double Amount { get; init; }
}

public record PaymentStatus
{
    [JsonPropertyName("status")]
    public string Status { get; init; } = "";

    [JsonPropertyName("payment_intent_id")]
    public string? PaymentIntentId { get; init; }

    [JsonPropertyName("amount")]
    public double? Amount { get; init; }
}

public record CreatePaymentIntentRequest
{
    [JsonPropertyName("order_id")]
    public int OrderId { get; init; }

    [JsonPropertyName("tip")]
    public double? Tip { get; init; }
}

public record ConfirmPaymentRequest
{
    [JsonPropertyName("order_id")]
    public int OrderId { get; init; }

    [JsonPropertyName("payment_intent_id")]
    public string PaymentIntentId { get; init; } = "";
}

public record CashPaymentRequest
{
    [JsonPropertyName("order_id")]
    public int OrderId { get; init; }

    [JsonPropertyName("tip")]
    public double? Tip { get; init; }

    [JsonPropertyName("amount_received")]
    public double? AmountReceived { get; init; }
}
