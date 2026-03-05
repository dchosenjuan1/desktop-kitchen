package com.desktopkitchen.pos.ui.screens.pos

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.desktopkitchen.pos.app.AppState
import com.desktopkitchen.pos.app.Screen
import com.desktopkitchen.pos.models.CartItem
import com.desktopkitchen.pos.ui.theme.AppColors
import com.desktopkitchen.pos.ui.theme.Typography
import com.desktopkitchen.pos.utilities.CurrencyFormatter

@Composable
fun CartSidebar(
    cart: List<CartItem>,
    subtotal: Double,
    tax: Double,
    total: Double,
    onQuantityChange: (String, Int) -> Unit,
    onRemove: (String) -> Unit,
    onClear: () -> Unit,
    onPay: () -> Unit,
    onLogout: () -> Unit,
    onNavigate: (Screen) -> Unit,
    appState: AppState,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .background(AppColors.card)
            .padding(12.dp)
    ) {
        // Header with nav icons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Cart",
                style = Typography.titleLarge,
                color = AppColors.textPrimary
            )
            Row {
                val role = appState.currentEmployee?.role
                if (role == "admin" || role == "manager") {
                    IconButton(onClick = { onNavigate(Screen.Kitchen) }) {
                        Icon(Icons.Default.Restaurant, "Kitchen", tint = AppColors.textSecondary)
                    }
                    IconButton(onClick = { onNavigate(Screen.Reports) }) {
                        Icon(Icons.Default.Assessment, "Reports", tint = AppColors.textSecondary)
                    }
                }
                IconButton(onClick = onLogout) {
                    Icon(Icons.AutoMirrored.Filled.Logout, "Logout", tint = AppColors.textSecondary)
                }
            }
        }

        HorizontalDivider(color = AppColors.border, modifier = Modifier.padding(vertical = 8.dp))

        // Cart items
        if (cart.isEmpty()) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "Cart is empty",
                    style = Typography.bodyLarge,
                    color = AppColors.textTertiary
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(cart, key = { it.cartId }) { item ->
                    CartItemRow(
                        item = item,
                        onQuantityChange = { onQuantityChange(item.cartId, it) },
                        onRemove = { onRemove(item.cartId) }
                    )
                }
            }
        }

        // Totals
        if (cart.isNotEmpty()) {
            HorizontalDivider(color = AppColors.border, modifier = Modifier.padding(vertical = 8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Subtotal", style = Typography.bodyMedium, color = AppColors.textSecondary)
                Text(CurrencyFormatter.format(subtotal), style = Typography.bodyMedium, color = AppColors.textSecondary)
            }
            Spacer(modifier = Modifier.height(4.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(CurrencyFormatter.TAX_LABEL, style = Typography.bodyMedium, color = AppColors.textSecondary)
                Text(CurrencyFormatter.format(tax), style = Typography.bodyMedium, color = AppColors.textSecondary)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Total", style = Typography.titleMedium, color = AppColors.textPrimary)
                Text(CurrencyFormatter.format(total), style = Typography.titleMedium, color = AppColors.accent)
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                TextButton(
                    onClick = onClear,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.Delete, "Clear", tint = AppColors.error)
                    Text(" Clear", color = AppColors.error)
                }
                Button(
                    onClick = onPay,
                    modifier = Modifier.weight(2f),
                    colors = ButtonDefaults.buttonColors(containerColor = AppColors.accent),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        "Pay ${CurrencyFormatter.format(total)}",
                        style = Typography.titleMedium,
                        color = AppColors.textPrimary
                    )
                }
            }
        }
    }
}
