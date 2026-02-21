import Foundation

enum ReportEndpoints {
    static func sales(period: String) -> Endpoint {
        Endpoint(
            path: "/reports/sales",
            queryItems: [URLQueryItem(name: "period", value: period)]
        )
    }

    static func topItems(period: String, limit: Int = 10) -> Endpoint {
        Endpoint(
            path: "/reports/top-items",
            queryItems: [
                URLQueryItem(name: "period", value: period),
                URLQueryItem(name: "limit", value: String(limit)),
            ]
        )
    }

    static func employeePerformance(period: String) -> Endpoint {
        Endpoint(
            path: "/reports/employee-performance",
            queryItems: [URLQueryItem(name: "period", value: period)]
        )
    }

    static func hourly() -> Endpoint {
        Endpoint(path: "/reports/hourly")
    }

    static func cashCardBreakdown(period: String) -> Endpoint {
        Endpoint(
            path: "/reports/cash-card-breakdown",
            queryItems: [URLQueryItem(name: "period", value: period)]
        )
    }

    static func cogs(period: String) -> Endpoint {
        Endpoint(
            path: "/reports/cogs",
            queryItems: [URLQueryItem(name: "period", value: period)]
        )
    }

    static func categoryMargins(period: String) -> Endpoint {
        Endpoint(
            path: "/reports/category-margins",
            queryItems: [URLQueryItem(name: "period", value: period)]
        )
    }

    static func contributionMargin(period: String) -> Endpoint {
        Endpoint(
            path: "/reports/contribution-margin",
            queryItems: [URLQueryItem(name: "period", value: period)]
        )
    }

    static func live() -> Endpoint {
        Endpoint(path: "/reports/live")
    }

    static func deliveryMargins(period: String) -> Endpoint {
        Endpoint(
            path: "/reports/delivery-margins",
            queryItems: [URLQueryItem(name: "period", value: period)]
        )
    }

    static func channelComparison(period: String) -> Endpoint {
        Endpoint(
            path: "/reports/channel-comparison",
            queryItems: [URLQueryItem(name: "period", value: period)]
        )
    }
}
