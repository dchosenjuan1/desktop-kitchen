package com.desktopkitchen.pos.ui.screens.kitchen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.PointOfSale
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.desktopkitchen.pos.app.AppState
import com.desktopkitchen.pos.app.Screen
import com.desktopkitchen.pos.ui.theme.AppColors
import com.desktopkitchen.pos.ui.theme.Typography
import com.desktopkitchen.pos.viewmodels.KitchenViewModel

@Composable
fun KitchenScreen(
    viewModel: KitchenViewModel,
    appState: AppState
) {
    LaunchedEffect(Unit) {
        viewModel.startPolling()
    }
    DisposableEffect(Unit) {
        onDispose { viewModel.stopPolling() }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.background)
            .padding(12.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "Kitchen Display",
                    style = Typography.headlineMedium,
                    color = AppColors.textPrimary
                )
                if (viewModel.pendingCount > 0) {
                    Text(
                        text = "  ${viewModel.pendingCount} pending",
                        style = Typography.bodyMedium,
                        color = AppColors.warning
                    )
                }
            }
            Row {
                val role = appState.currentEmployee?.role
                if (role != "kitchen") {
                    IconButton(onClick = { appState.navigate(Screen.POS) }) {
                        Icon(Icons.Default.PointOfSale, "POS", tint = AppColors.textSecondary)
                    }
                }
                IconButton(onClick = { appState.logout() }) {
                    Icon(Icons.AutoMirrored.Filled.Logout, "Logout", tint = AppColors.textSecondary)
                }
            }
        }

        // Content
        if (viewModel.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = AppColors.accent)
            }
        } else if (viewModel.orders.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "No active orders",
                    style = Typography.bodyLarge,
                    color = AppColors.textTertiary
                )
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 300.dp),
                contentPadding = PaddingValues(top = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(viewModel.orders, key = { it.id }) { order ->
                    KitchenOrderCard(
                        order = order,
                        elapsedSeconds = viewModel.elapsedSeconds(order),
                        isUrgent = viewModel.isUrgent(order),
                        onStart = { viewModel.startOrder(order.id) },
                        onReady = { viewModel.markReady(order.id) }
                    )
                }
            }
        }
    }
}
