package com.desktopkitchen.pos.ui.screens.login

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.desktopkitchen.pos.ui.theme.AppColors

@Composable
fun ServerSettingsDialog(
    onDismiss: () -> Unit,
    viewModel: ServerSettingsViewModel = hiltViewModel()
) {
    var baseURL by remember { mutableStateOf(viewModel.getBaseURL()) }
    var tenantID by remember { mutableStateOf(viewModel.getTenantID()) }
    var adminSecret by remember { mutableStateOf(viewModel.getAdminSecret()) }

    val textFieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = AppColors.accent,
        unfocusedBorderColor = AppColors.borderLight,
        focusedTextColor = AppColors.textPrimary,
        unfocusedTextColor = AppColors.textPrimary,
        cursorColor = AppColors.accent,
        focusedLabelColor = AppColors.accent,
        unfocusedLabelColor = AppColors.textSecondary
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = AppColors.card,
        title = { Text("Server Settings", color = AppColors.textPrimary) },
        text = {
            Column {
                OutlinedTextField(
                    value = baseURL,
                    onValueChange = { baseURL = it },
                    label = { Text("Server URL") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = textFieldColors,
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = tenantID,
                    onValueChange = { tenantID = it },
                    label = { Text("Tenant ID") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = textFieldColors,
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = adminSecret,
                    onValueChange = { adminSecret = it },
                    label = { Text("Admin Secret") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = textFieldColors,
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation()
                )
            }
        },
        confirmButton = {
            TextButton(onClick = {
                viewModel.save(baseURL, tenantID, adminSecret)
                onDismiss()
            }) {
                Text("Save", color = AppColors.accent)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = AppColors.textSecondary)
            }
        }
    )
}
