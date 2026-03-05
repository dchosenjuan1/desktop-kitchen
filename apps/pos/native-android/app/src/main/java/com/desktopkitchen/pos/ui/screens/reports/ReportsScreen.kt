package com.desktopkitchen.pos.ui.screens.reports

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.desktopkitchen.pos.app.AppState
import com.desktopkitchen.pos.app.Screen
import com.desktopkitchen.pos.ui.theme.AppColors
import com.desktopkitchen.pos.ui.theme.Typography
import com.desktopkitchen.pos.utilities.CurrencyFormatter
import com.desktopkitchen.pos.viewmodels.ReportPeriod
import com.desktopkitchen.pos.viewmodels.ReportsViewModel

@Composable
fun ReportsScreen(
    viewModel: ReportsViewModel,
    appState: AppState
) {
    LaunchedEffect(Unit) {
        viewModel.loadData()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.background)
            .padding(16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { appState.navigate(Screen.POS) }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = AppColors.textSecondary)
            }
            Text(
                text = "Reports",
                style = Typography.headlineMedium,
                color = AppColors.textPrimary
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Period selector
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ReportPeriod.entries.forEach { period ->
                FilterChip(
                    selected = viewModel.period == period,
                    onClick = { viewModel.changePeriod(period) },
                    label = { Text(period.label) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = AppColors.accent,
                        selectedLabelColor = AppColors.textPrimary,
                        containerColor = AppColors.card,
                        labelColor = AppColors.textSecondary
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (viewModel.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = AppColors.accent)
            }
        } else {
            Row(
                modifier = Modifier.fillMaxSize()
            ) {
                // KPI Cards (left)
                Column(
                    modifier = Modifier.weight(0.5f),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    viewModel.salesData?.let { sales ->
                        KPICard("Total Revenue", CurrencyFormatter.format(sales.total_revenue))
                        KPICard("Orders", "${sales.order_count}")
                        KPICard("Avg Ticket", CurrencyFormatter.format(sales.avg_ticket))
                        KPICard("Tips", CurrencyFormatter.format(sales.tip_total))
                    }
                }

                Spacer(modifier = Modifier.width(16.dp))

                // Top Items (right)
                Column(
                    modifier = Modifier.weight(0.5f)
                ) {
                    Text(
                        text = "Top Items",
                        style = Typography.titleMedium,
                        color = AppColors.textPrimary
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    if (viewModel.topItems.isEmpty()) {
                        Text(
                            text = "No data available",
                            style = Typography.bodyMedium,
                            color = AppColors.textTertiary
                        )
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            itemsIndexed(viewModel.topItems) { index, item ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(AppColors.card)
                                        .padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = "${index + 1}.",
                                            style = Typography.labelLarge,
                                            color = AppColors.textTertiary
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column {
                                            Text(
                                                text = item.item_name,
                                                style = Typography.bodyMedium,
                                                color = AppColors.textPrimary
                                            )
                                            Text(
                                                text = "${item.quantity_sold} sold",
                                                style = Typography.bodySmall,
                                                color = AppColors.textTertiary
                                            )
                                        }
                                    }
                                    Text(
                                        text = CurrencyFormatter.format(item.revenue),
                                        style = Typography.bodyMedium,
                                        color = AppColors.accent
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun KPICard(label: String, value: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(AppColors.card)
            .padding(16.dp)
    ) {
        Text(
            text = label,
            style = Typography.bodySmall,
            color = AppColors.textTertiary
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            style = Typography.headlineMedium,
            color = AppColors.textPrimary
        )
    }
}
