package com.desktopkitchen.pos.viewmodels

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.desktopkitchen.pos.models.HourlyReport
import com.desktopkitchen.pos.models.SalesReport
import com.desktopkitchen.pos.models.TopItemsReport
import com.desktopkitchen.pos.services.ReportService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class ReportPeriod(val value: String, val label: String) {
    TODAY("today", "Today"),
    WEEK("week", "This Week"),
    MONTH("month", "This Month")
}

@HiltViewModel
class ReportsViewModel @Inject constructor(
    private val reportService: ReportService
) : ViewModel() {

    var period by mutableStateOf(ReportPeriod.TODAY)
    var salesData by mutableStateOf<SalesReport?>(null)
        private set
    var topItems by mutableStateOf<List<TopItemsReport>>(emptyList())
        private set
    var hourlyData by mutableStateOf<List<HourlyReport>>(emptyList())
        private set
    var isLoading by mutableStateOf(true)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    fun loadData() {
        viewModelScope.launch {
            isLoading = true
            error = null
            try {
                salesData = reportService.getSales(period.value)
                topItems = reportService.getTopItems(period.value, 10)
                hourlyData = reportService.getHourly()
            } catch (e: Exception) {
                error = e.message
            }
            isLoading = false
        }
    }

    fun changePeriod(newPeriod: ReportPeriod) {
        period = newPeriod
        loadData()
    }
}
