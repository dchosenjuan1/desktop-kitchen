import Foundation

struct SalesReport: Codable, Sendable {
    var period: String
    var total_revenue: Double
    var order_count: Int
    var avg_ticket: Double
    var tip_total: Double
}

struct TopItemsReport: Codable, Identifiable, Sendable {
    var id: String { item_name }
    var item_name: String
    var quantity_sold: Int
    var revenue: Double
}

struct EmployeePerformanceReport: Codable, Identifiable, Sendable {
    var id: Int { employee_id }
    var employee_id: Int
    var employee_name: String
    var orders_processed: Int
    var total_sales: Double
    var avg_ticket: Double
    var tips_received: Double
}

struct HourlyReport: Codable, Identifiable, Sendable {
    var id: Int { hour }
    var hour: Int
    var orders: Int
    var revenue: Double
    var avg_ticket: Double

    var hourLabel: String {
        let h = hour % 12 == 0 ? 12 : hour % 12
        let ampm = hour < 12 ? "AM" : "PM"
        return "\(h)\(ampm)"
    }
}

/* Financial Report Types */

struct CashCardBreakdownEntry: Codable, Sendable {
    var payment_method: String
    var count: Int
    var total: Double
    var tips: Double
    var percentage: Double
    var revenue_percentage: Double
}

struct CashCardBreakdown: Codable, Sendable {
    var period: String
    var total_orders: Int
    var total_revenue: Double
    var breakdown: [CashCardBreakdownEntry]
}

struct COGSItem: Codable, Identifiable, Sendable {
    var id: Int { menu_item_id }
    var menu_item_id: Int
    var item_name: String
    var quantity_sold: Int
    var revenue: Double
    var cogs: Double
    var margin: Double
    var margin_percent: Double
}

struct COGSTotals: Codable, Sendable {
    var total_revenue: Double
    var total_cogs: Double
    var total_margin: Double
    var overall_margin_percent: Double
}

struct COGSReport: Codable, Sendable {
    var period: String
    var items: [COGSItem]
    var totals: COGSTotals
}

struct CategoryMarginEntry: Codable, Identifiable, Sendable {
    var id: Int { category_id }
    var category_id: Int
    var category_name: String
    var quantity_sold: Int
    var revenue: Double
    var cogs: Double
    var margin: Double
    var margin_percent: Double
}

struct CategoryMargins: Codable, Sendable {
    var period: String
    var categories: [CategoryMarginEntry]
}

struct ContributionMarginEntry: Codable, Sendable {
    var date: String
    var revenue: Double
    var cogs: Double
    var contribution_margin: Double
    var margin_percent: Double
    var orders: Int
}

struct ContributionMarginReport: Codable, Sendable {
    var period: String
    var data: [ContributionMarginEntry]
}

struct LiveDashboardKPIs: Codable, Sendable {
    var order_count: Int
    var revenue: Double
    var avg_ticket: Double
    var tips: Double
    var cash_orders: Int
    var card_orders: Int
    var cash_revenue: Double
    var card_revenue: Double
}

struct LiveHourlyEntry: Codable, Sendable {
    var hour: Int
    var orders: Int
    var revenue: Double
}

struct LiveSourceEntry: Codable, Sendable {
    var source: String
    var count: Int
    var revenue: Double
}

struct LiveTopItem: Codable, Sendable {
    var item_name: String
    var qty: Int
}

struct LiveDashboardData: Codable, Sendable {
    var date: String
    var kpis: LiveDashboardKPIs
    var hourly: [LiveHourlyEntry]
    var sources: [LiveSourceEntry]
    var topItems: [LiveTopItem]
}
