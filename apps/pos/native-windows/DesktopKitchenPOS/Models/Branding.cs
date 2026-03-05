using System.Text.Json.Serialization;

namespace DesktopKitchenPOS.Models;

public record TenantBranding
{
    [JsonPropertyName("primaryColor")]
    public string? PrimaryColor { get; init; }

    [JsonPropertyName("logoUrl")]
    public string? LogoUrl { get; init; }

    [JsonPropertyName("restaurantName")]
    public string? RestaurantName { get; init; }
}
