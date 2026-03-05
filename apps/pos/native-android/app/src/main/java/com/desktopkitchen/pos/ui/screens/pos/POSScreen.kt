package com.desktopkitchen.pos.ui.screens.pos

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.desktopkitchen.pos.app.AppState
import com.desktopkitchen.pos.ui.theme.AppColors
import com.desktopkitchen.pos.ui.theme.Typography
import com.desktopkitchen.pos.viewmodels.POSViewModel

@Composable
fun POSScreen(
    viewModel: POSViewModel,
    appState: AppState
) {
    LaunchedEffect(Unit) {
        viewModel.loadData()
    }

    if (viewModel.isLoading) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(AppColors.background),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = AppColors.accent)
        }
        return
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.background)
    ) {
        // Menu area (65%)
        Column(
            modifier = Modifier
                .weight(0.65f)
                .fillMaxHeight()
                .padding(12.dp)
        ) {
            // Category pills
            CategoryPills(
                categories = viewModel.categories,
                selectedId = viewModel.selectedCategoryId,
                onSelect = { viewModel.selectedCategoryId = it }
            )

            // Menu grid
            if (viewModel.filteredItems.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No items found",
                        style = Typography.bodyLarge,
                        color = AppColors.textTertiary
                    )
                }
            } else {
                MenuGrid(
                    items = viewModel.filteredItems,
                    onItemClick = { viewModel.addToCart(it) },
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Cart sidebar (35%)
        CartSidebar(
            cart = viewModel.cart,
            subtotal = viewModel.subtotal,
            tax = viewModel.tax,
            total = viewModel.cartTotal,
            onQuantityChange = { cartId, qty -> viewModel.updateQuantity(cartId, qty) },
            onRemove = { viewModel.removeFromCart(it) },
            onClear = { viewModel.clearCart() },
            onPay = { viewModel.showPaymentSheet = true },
            onLogout = { appState.logout() },
            onNavigate = { appState.navigate(it) },
            appState = appState,
            modifier = Modifier
                .weight(0.35f)
                .fillMaxHeight()
        )
    }

    // Order confirmation overlay
    if (viewModel.showOrderConfirmation) {
        OrderConfirmationOverlay(
            orderNumber = viewModel.confirmedOrderNumber,
            onDismiss = { viewModel.dismissOrderConfirmation() }
        )
    }
}
