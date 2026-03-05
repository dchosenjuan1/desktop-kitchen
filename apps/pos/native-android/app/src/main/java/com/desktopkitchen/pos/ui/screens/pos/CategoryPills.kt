package com.desktopkitchen.pos.ui.screens.pos

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.desktopkitchen.pos.models.MenuCategory
import com.desktopkitchen.pos.ui.theme.AppColors

@Composable
fun CategoryPills(
    categories: List<MenuCategory>,
    selectedId: Int?,
    onSelect: (Int?) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyRow(
        modifier = modifier.padding(bottom = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // "All" chip
        item {
            FilterChip(
                selected = selectedId == null,
                onClick = { onSelect(null) },
                label = { Text("All") },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = AppColors.accent,
                    selectedLabelColor = AppColors.textPrimary,
                    containerColor = AppColors.card,
                    labelColor = AppColors.textSecondary
                )
            )
        }

        items(categories) { category ->
            FilterChip(
                selected = selectedId == category.id,
                onClick = { onSelect(category.id) },
                label = { Text(category.name) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = AppColors.accent,
                    selectedLabelColor = AppColors.textPrimary,
                    containerColor = AppColors.card,
                    labelColor = AppColors.textSecondary
                )
            )
        }
    }
}
