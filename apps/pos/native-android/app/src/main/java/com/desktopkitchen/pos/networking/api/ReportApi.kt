package com.desktopkitchen.pos.networking.api

import com.desktopkitchen.pos.models.HourlyReport
import com.desktopkitchen.pos.models.LiveDashboardData
import com.desktopkitchen.pos.models.SalesReport
import com.desktopkitchen.pos.models.TopItemsReport
import retrofit2.http.GET
import retrofit2.http.Query

interface ReportApi {
    @GET("api/reports/sales")
    suspend fun getSales(@Query("period") period: String): SalesReport

    @GET("api/reports/top-items")
    suspend fun getTopItems(
        @Query("period") period: String,
        @Query("limit") limit: Int = 10
    ): List<TopItemsReport>

    @GET("api/reports/hourly")
    suspend fun getHourly(): List<HourlyReport>

    @GET("api/reports/live")
    suspend fun getLive(): LiveDashboardData
}
