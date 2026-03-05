using System.Text.Json.Serialization;

namespace DesktopKitchenPOS.Models;

public record Order
{
    [JsonPropertyName("id")]
    public int Id { get; init; }

    [JsonPropertyName("order_number")]
    public string OrderNumber { get; init; } = "";

    [JsonPropertyName("employee_id")]
    public int? EmployeeId { get; init; }

    [JsonPropertyName("employee_name")]
    public string? EmployeeName { get; init; }

    [JsonPropertyName("status")]
    public string Status { get; init; } = "pending";

    [JsonPropertyName("subtotal")]
    public double? Subtotal { get; init; }

    [JsonPropertyName("tax")]
    public double? Tax { get; init; }

    [JsonPropertyName("tip")]
    public double? Tip { get; init; }

    [JsonPropertyName("total")]
    public double? Total { get; init; }

    [JsonPropertyName("payment_intent_id")]
    public string? PaymentIntentId { get; init; }

    [JsonPropertyName("payment_status")]
    public string? PaymentStatus { get; init; }

    [JsonPropertyName("payment_method")]
    public string? PaymentMethod { get; init; }

    [JsonPropertyName("source")]
    public string? Source { get; init; }

    [JsonPropertyName("created_at")]
    public string? CreatedAt { get; init; }

    [JsonPropertyName("completed_at")]
    public string? CompletedAt { get; init; }

    [JsonPropertyName("items")]
    public List<OrderItem>? Items { get; init; }
}

public record OrderItem
{
    [JsonPropertyName("id")]
    public int? Id { get; init; }

    [JsonPropertyName("order_id")]
    public int? OrderId { get; init; }

    [JsonPropertyName("menu_item_id")]
    public int? MenuItemId { get; init; }

    [JsonPropertyName("item_name")]
    public string ItemName { get; init; } = "";

    [JsonPropertyName("quantity")]
    public int Quantity { get; init; }

    [JsonPropertyName("unit_price")]
    public double? UnitPrice { get; init; }

    [JsonPropertyName("notes")]
    public string? Notes { get; init; }

    [JsonPropertyName("combo_instance_id")]
    public string? ComboInstanceId { get; init; }

    [JsonPropertyName("modifiers")]
    public List<OrderItemModifier>? Modifiers { get; init; }
}

public record OrderItemModifier
{
    [JsonPropertyName("id")]
    public int? Id { get; init; }

    [JsonPropertyName("order_item_id")]
    public int? OrderItemId { get; init; }

    [JsonPropertyName("modifier_id")]
    public int? ModifierId { get; init; }

    [JsonPropertyName("modifier_name")]
    public string ModifierName { get; init; } = "";

    [JsonPropertyName("price_adjustment")]
    public double PriceAdjustment { get; init; }
}

public class CartItem
{
    public string CartId { get; set; } = Guid.NewGuid().ToString();
    public int MenuItemId { get; set; }
    public string ItemName { get; set; } = "";
    public int Quantity { get; set; }
    public double UnitPrice { get; set; }
    public string? Notes { get; set; }
    public MenuItem? MenuItemRef { get; set; }
    public List<int>? SelectedModifierIds { get; set; }
    public List<string>? SelectedModifierNames { get; set; }

    public double LineTotal => UnitPrice * Quantity;
}

public record CreateOrderRequest
{
    [JsonPropertyName("employee_id")]
    public int EmployeeId { get; init; }

    [JsonPropertyName("items")]
    public List<CreateOrderItem> Items { get; init; } = new();
}

public record CreateOrderItem
{
    [JsonPropertyName("menu_item_id")]
    public int MenuItemId { get; init; }

    [JsonPropertyName("quantity")]
    public int Quantity { get; init; }

    [JsonPropertyName("notes")]
    public string? Notes { get; init; }

    [JsonPropertyName("modifiers")]
    public List<int>? Modifiers { get; init; }

    [JsonPropertyName("combo_instance_id")]
    public string? ComboInstanceId { get; init; }
}
