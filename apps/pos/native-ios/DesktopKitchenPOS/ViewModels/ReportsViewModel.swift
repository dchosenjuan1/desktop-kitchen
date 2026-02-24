import Foundation

@Observable @MainActor
final class ReportsViewModel {
    var period: ReportPeriod = .today
    var salesData: SalesReport?
    var topItems: [TopItemsReport] = []
    var employeePerf: [EmployeePerformanceReport] = []
    var hourlyData: [HourlyReport] = []
    var isLoading = true
    var error: String?

    func loadData() async {
        isLoading = true
        error = nil
        do {
            async let sales = ReportService.getSales(period: period.rawValue)
            async let items = ReportService.getTopItems(period: period.rawValue, limit: 10)
            async let perf = ReportService.getEmployeePerformance(period: period.rawValue)
            async let hourly = ReportService.getHourly()

            salesData = try await sales
            topItems = try await items
            employeePerf = try await perf
            hourlyData = try await hourly
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func generateCSV() -> String {
        var csv = "Metric,Value\n"
        csv += "Period,\(period.rawValue)\n"
        csv += "Total Revenue,\(salesData?.total_revenue ?? 0)\n"
        csv += "Order Count,\(salesData?.order_count ?? 0)\n"
        csv += "Avg Ticket,\(salesData?.avg_ticket ?? 0)\n"
        csv += "Total Tips,\(salesData?.tip_total ?? 0)\n"
        csv += "\n"
        csv += "Top Items\n"
        csv += "Item,Quantity Sold,Revenue\n"
        for item in topItems {
            csv += "\"\(item.item_name)\",\(item.quantity_sold),\(item.revenue)\n"
        }
        csv += "\n"
        csv += "Employee Performance\n"
        csv += "Employee,Orders,Total Sales,Avg Ticket,Tips\n"
        for emp in employeePerf {
            csv += "\"\(emp.employee_name)\",\(emp.orders_processed),\(emp.total_sales),\(emp.avg_ticket),\(emp.tips_received)\n"
        }
        return csv
    }
}

enum ReportPeriod: String, CaseIterable {
    case today
    case week
    case month

    var label: String {
        switch self {
        case .today: return "Today"
        case .week: return "This Week"
        case .month: return "This Month"
        }
    }
}
