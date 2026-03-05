using System.Text.Json.Serialization;

namespace DesktopKitchenPOS.Models;

public record Employee
{
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; } = "";

    [JsonPropertyName("pin")]
    public string? Pin { get; init; }

    [JsonPropertyName("role")]
    public string Role { get; init; } = "cashier";

    [JsonPropertyName("active")]
    public bool Active { get; init; } = true;

    [JsonPropertyName("created_at")]
    public string? CreatedAt { get; init; }

    [JsonPropertyName("token")]
    public string? Token { get; init; }

    public string DisplayRole => char.ToUpper(Role[0]) + Role[1..];
}

public record LoginRequest
{
    [JsonPropertyName("pin")]
    public string Pin { get; init; } = "";
}
