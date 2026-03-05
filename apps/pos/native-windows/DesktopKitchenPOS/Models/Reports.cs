using System.Text.Json.Serialization;

namespace DesktopKitchenPOS.Models;

public record SalesReport
{
    [JsonPropertyName("period")]
    public string Period { get; init; } = "";

    [JsonPropertyName("total_revenue")]
    public double TotalRevenue { get; init; }

    [JsonPropertyName("order_count")]
    public int OrderCount { get; init; }

    [JsonPropertyName("avg_ticket")]
    public double AvgTicket { get; init; }

    [JsonPropertyName("tip_total")]
    public double TipTotal { get; init; }
}

public record TopItemsReport
{
    [JsonPropertyName("item_name")]
    public string ItemName { get; init; } = "";

    [JsonPropertyName("quantity_sold")]
    public int QuantitySold { get; init; }

    [JsonPropertyName("revenue")]
    public double Revenue { get; init; }
}

public record HourlyReport
{
    [JsonPropertyName("hour")]
    public int Hour { get; init; }

    [JsonPropertyName("orders")]
    public int Orders { get; init; }

    [JsonPropertyName("revenue")]
    public double Revenue { get; init; }

    [JsonPropertyName("avg_ticket")]
    public double AvgTicket { get; init; }

    public string HourLabel
    {
        get
        {
            var h = Hour % 12 == 0 ? 12 : Hour % 12;
            var ampm = Hour < 12 ? "AM" : "PM";
            return $"{h}{ampm}";
        }
    }
}

public record LiveDashboardKPIs
{
    [JsonPropertyName("order_count")]
    public int? OrderCount { get; init; }

    [JsonPropertyName("revenue")]
    public double? Revenue { get; init; }

    [JsonPropertyName("avg_ticket")]
    public double? AvgTicket { get; init; }

    [JsonPropertyName("tips")]
    public double? Tips { get; init; }

    [JsonPropertyName("cash_orders")]
    public int? CashOrders { get; init; }

    [JsonPropertyName("card_orders")]
    public int? CardOrders { get; init; }

    [JsonPropertyName("cash_revenue")]
    public double? CashRevenue { get; init; }

    [JsonPropertyName("card_revenue")]
    public double? CardRevenue { get; init; }
}

public record LiveDashboardData
{
    [JsonPropertyName("date")]
    public string Date { get; init; } = "";

    [JsonPropertyName("kpis")]
    public LiveDashboardKPIs Kpis { get; init; } = new();

    [JsonPropertyName("hourly")]
    public List<LiveHourlyEntry> Hourly { get; init; } = new();

    [JsonPropertyName("sources")]
    public List<LiveSourceEntry> Sources { get; init; } = new();

    [JsonPropertyName("topItems")]
    public List<LiveTopItem> TopItems { get; init; } = new();
}

public record LiveHourlyEntry
{
    [JsonPropertyName("hour")]
    public int Hour { get; init; }

    [JsonPropertyName("orders")]
    public int Orders { get; init; }

    [JsonPropertyName("revenue")]
    public double Revenue { get; init; }
}

public record LiveSourceEntry
{
    [JsonPropertyName("source")]
    public string Source { get; init; } = "";

    [JsonPropertyName("count")]
    public int Count { get; init; }

    [JsonPropertyName("revenue")]
    public double Revenue { get; init; }
}

public record LiveTopItem
{
    [JsonPropertyName("item_name")]
    public string ItemName { get; init; } = "";

    [JsonPropertyName("qty")]
    public int Qty { get; init; }
}
