import Foundation

enum ReportService {
    static func getSales(period: String) async throws -> SalesReport {
        try await APIClient.shared.request(ReportEndpoints.sales(period: period))
    }

    static func getTopItems(period: String, limit: Int = 10) async throws -> [TopItemsReport] {
        try await APIClient.shared.request(ReportEndpoints.topItems(period: period, limit: limit))
    }

    static func getEmployeePerformance(period: String) async throws -> [EmployeePerformanceReport] {
        try await APIClient.shared.request(ReportEndpoints.employeePerformance(period: period))
    }

    static func getHourly() async throws -> [HourlyReport] {
        try await APIClient.shared.request(ReportEndpoints.hourly())
    }

    static func getCashCardBreakdown(period: String) async throws -> CashCardBreakdown {
        try await APIClient.shared.request(ReportEndpoints.cashCardBreakdown(period: period))
    }

    static func getCOGS(period: String) async throws -> COGSReport {
        try await APIClient.shared.request(ReportEndpoints.cogs(period: period))
    }

    static func getCategoryMargins(period: String) async throws -> CategoryMargins {
        try await APIClient.shared.request(ReportEndpoints.categoryMargins(period: period))
    }

    static func getContributionMargin(period: String) async throws -> ContributionMarginReport {
        try await APIClient.shared.request(ReportEndpoints.contributionMargin(period: period))
    }

    static func getLive() async throws -> LiveDashboardData {
        try await APIClient.shared.request(ReportEndpoints.live())
    }

    static func getDeliveryMargins(period: String) async throws -> DeliveryMarginReport {
        try await APIClient.shared.request(ReportEndpoints.deliveryMargins(period: period))
    }

    static func getChannelComparison(period: String) async throws -> ChannelComparisonReport {
        try await APIClient.shared.request(ReportEndpoints.channelComparison(period: period))
    }
}

// Generic response wrappers for untyped endpoints
struct DeliveryMarginReport: Codable, Sendable {
    var period: String?
    var data: [DeliveryMarginEntry]?
}

struct DeliveryMarginEntry: Codable, Sendable {
    var platform_name: String?
    var order_count: Int?
    var revenue: Double?
    var commission: Double?
    var net_revenue: Double?
}

struct ChannelComparisonReport: Codable, Sendable {
    var period: String?
    var channels: [ChannelEntry]?
}

struct ChannelEntry: Codable, Sendable {
    var source: String?
    var order_count: Int?
    var revenue: Double?
    var avg_ticket: Double?
}
