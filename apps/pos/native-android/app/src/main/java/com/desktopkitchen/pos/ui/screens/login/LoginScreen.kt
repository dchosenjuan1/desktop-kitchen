package com.desktopkitchen.pos.ui.screens.login

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Backspace
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.desktopkitchen.pos.app.AppState
import com.desktopkitchen.pos.ui.components.shake
import com.desktopkitchen.pos.ui.theme.AppColors
import com.desktopkitchen.pos.ui.theme.Typography
import com.desktopkitchen.pos.viewmodels.LoginViewModel

@Composable
fun LoginScreen(
    viewModel: LoginViewModel,
    appState: AppState
) {
    var showSettings by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.background)
    ) {
        // Settings gear icon (top-right)
        IconButton(
            onClick = { showSettings = true },
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Settings,
                contentDescription = "Server Settings",
                tint = AppColors.textTertiary
            )
        }

        // Center content
        Column(
            modifier = Modifier.align(Alignment.Center),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Desktop Kitchen POS",
                style = Typography.headlineLarge,
                color = AppColors.textPrimary
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Enter your PIN to log in",
                style = Typography.bodyLarge,
                color = AppColors.textSecondary
            )

            Spacer(modifier = Modifier.height(32.dp))

            // PIN dots
            Row(
                modifier = Modifier.shake(viewModel.shake),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                viewModel.dots.forEach { filled ->
                    Box(
                        modifier = Modifier
                            .size(20.dp)
                            .clip(CircleShape)
                            .background(
                                if (filled) AppColors.accent else AppColors.surface
                            )
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Error message
            viewModel.error?.let { errorMsg ->
                Text(
                    text = errorMsg,
                    style = Typography.bodySmall,
                    color = AppColors.error
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Loading indicator
            if (viewModel.isLoading) {
                CircularProgressIndicator(
                    color = AppColors.accent,
                    modifier = Modifier.size(32.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Numpad
            val digits = listOf(
                listOf("1", "2", "3"),
                listOf("4", "5", "6"),
                listOf("7", "8", "9"),
                listOf("C", "0", "<")
            )

            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                digits.forEach { row ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        row.forEach { key ->
                            when (key) {
                                "C" -> NumpadButton(
                                    label = "C",
                                    onClick = { viewModel.clear() }
                                )
                                "<" -> NumpadButton(
                                    icon = Icons.Default.Backspace,
                                    onClick = { viewModel.backspace() }
                                )
                                else -> NumpadButton(
                                    label = key,
                                    onClick = {
                                        viewModel.appendDigit(key) { employee ->
                                            appState.loginSucceeded(employee)
                                        }
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showSettings) {
        ServerSettingsDialog(onDismiss = { showSettings = false })
    }
}
