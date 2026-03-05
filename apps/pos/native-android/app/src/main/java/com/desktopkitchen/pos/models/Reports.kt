package com.desktopkitchen.pos.models

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class SalesReport(
    val period: String,
    val total_revenue: Double = 0.0,
    val order_count: Int = 0,
    val avg_ticket: Double = 0.0,
    val tip_total: Double = 0.0
)

@JsonClass(generateAdapter = true)
data class TopItemsReport(
    val item_name: String,
    val quantity_sold: Int = 0,
    val revenue: Double = 0.0
)

@JsonClass(generateAdapter = true)
data class HourlyReport(
    val hour: Int,
    val orders: Int = 0,
    val revenue: Double = 0.0,
    val avg_ticket: Double = 0.0
) {
    val hourLabel: String
        get() {
            val h = if (hour % 12 == 0) 12 else hour % 12
            val ampm = if (hour < 12) "AM" else "PM"
            return "$h$ampm"
        }
}

@JsonClass(generateAdapter = true)
data class LiveDashboardKPIs(
    val order_count: Int? = null,
    val revenue: Double? = null,
    val avg_ticket: Double? = null,
    val tips: Double? = null,
    val cash_orders: Int? = null,
    val card_orders: Int? = null,
    val cash_revenue: Double? = null,
    val card_revenue: Double? = null
)

@JsonClass(generateAdapter = true)
data class LiveDashboardData(
    val date: String,
    val kpis: LiveDashboardKPIs,
    val hourly: List<LiveHourlyEntry> = emptyList(),
    val sources: List<LiveSourceEntry> = emptyList(),
    val topItems: List<LiveTopItem> = emptyList()
)

@JsonClass(generateAdapter = true)
data class LiveHourlyEntry(
    val hour: Int,
    val orders: Int = 0,
    val revenue: Double = 0.0
)

@JsonClass(generateAdapter = true)
data class LiveSourceEntry(
    val source: String,
    val count: Int = 0,
    val revenue: Double = 0.0
)

@JsonClass(generateAdapter = true)
data class LiveTopItem(
    val item_name: String,
    val qty: Int = 0
)
