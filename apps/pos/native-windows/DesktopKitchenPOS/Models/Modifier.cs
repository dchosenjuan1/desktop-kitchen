using System.Text.Json.Serialization;

namespace DesktopKitchenPOS.Models;

public record ModifierGroup
{
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; } = "";

    [JsonPropertyName("selection_type")]
    public string SelectionType { get; init; } = "single";

    [JsonPropertyName("required")]
    public bool Required { get; init; }

    [JsonPropertyName("min_selections")]
    public int MinSelections { get; init; }

    [JsonPropertyName("max_selections")]
    public int MaxSelections { get; init; }

    [JsonPropertyName("sort_order")]
    public int SortOrder { get; init; }

    [JsonPropertyName("active")]
    public bool Active { get; init; } = true;

    [JsonPropertyName("modifiers")]
    public List<ModifierItem>? Modifiers { get; init; }
}

public record ModifierItem
{
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("group_id")]
    public int GroupId { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; } = "";

    [JsonPropertyName("price_adjustment")]
    public double PriceAdjustment { get; init; }

    [JsonPropertyName("sort_order")]
    public int SortOrder { get; init; }

    [JsonPropertyName("active")]
    public bool Active { get; init; } = true;
}
