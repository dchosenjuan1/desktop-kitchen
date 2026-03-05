package com.desktopkitchen.pos.ui.screens.kitchen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.desktopkitchen.pos.models.Order
import com.desktopkitchen.pos.ui.theme.AppColors
import com.desktopkitchen.pos.ui.theme.Typography
import com.desktopkitchen.pos.utilities.DateFormatters

@Composable
fun KitchenOrderCard(
    order: Order,
    elapsedSeconds: Int,
    isUrgent: Boolean,
    onStart: () -> Unit,
    onReady: () -> Unit,
    modifier: Modifier = Modifier
) {
    val borderColor = when {
        isUrgent -> AppColors.error
        order.status == "pending" -> AppColors.warning
        order.status == "preparing" -> AppColors.info
        else -> AppColors.border
    }

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .border(2.dp, borderColor, RoundedCornerShape(12.dp))
            .background(AppColors.card)
            .padding(12.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "#${order.order_number}",
                style = Typography.titleMedium,
                color = AppColors.textPrimary
            )
            Text(
                text = DateFormatters.formatElapsed(elapsedSeconds),
                style = Typography.labelMedium,
                color = if (isUrgent) AppColors.error else AppColors.textSecondary
            )
        }

        // Status badge
        Text(
            text = order.status.uppercase(),
            style = Typography.labelMedium,
            color = when (order.status) {
                "pending" -> AppColors.warning
                "preparing" -> AppColors.info
                "ready" -> AppColors.success
                else -> AppColors.textTertiary
            }
        )

        // Source
        order.source?.let { source ->
            if (source != "pos") {
                Text(
                    text = source.replace("_", " ").uppercase(),
                    style = Typography.bodySmall,
                    color = AppColors.textTertiary
                )
            }
        }

        HorizontalDivider(color = AppColors.border, modifier = Modifier.padding(vertical = 8.dp))

        // Items
        order.items?.forEach { item ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "${item.quantity}x ${item.item_name}",
                    style = Typography.bodyMedium,
                    color = AppColors.textPrimary,
                    modifier = Modifier.weight(1f)
                )
            }
            item.notes?.let { notes ->
                Text(
                    text = notes,
                    style = Typography.bodySmall,
                    color = AppColors.warning
                )
            }
            item.modifiers?.forEach { mod ->
                Text(
                    text = "  + ${mod.modifier_name}",
                    style = Typography.bodySmall,
                    color = AppColors.textTertiary
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Action button
        when (order.status) {
            "pending" -> Button(
                onClick = onStart,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = AppColors.info),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Start Preparing", color = AppColors.textPrimary)
            }
            "preparing" -> Button(
                onClick = onReady,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = AppColors.success),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Mark Ready", color = AppColors.textPrimary)
            }
        }
    }
}
