package com.desktopkitchen.pos.services

import com.desktopkitchen.pos.models.HourlyReport
import com.desktopkitchen.pos.models.LiveDashboardData
import com.desktopkitchen.pos.models.SalesReport
import com.desktopkitchen.pos.models.TopItemsReport
import com.desktopkitchen.pos.networking.api.ReportApi
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ReportService @Inject constructor(
    private val reportApi: ReportApi
) {
    suspend fun getSales(period: String): SalesReport = reportApi.getSales(period)

    suspend fun getTopItems(period: String, limit: Int = 10): List<TopItemsReport> =
        reportApi.getTopItems(period, limit)

    suspend fun getHourly(): List<HourlyReport> = reportApi.getHourly()

    suspend fun getLive(): LiveDashboardData = reportApi.getLive()
}
