package com.desktopkitchen.pos.ui.screens.login

import androidx.lifecycle.ViewModel
import com.desktopkitchen.pos.configuration.ServerConfig
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class ServerSettingsViewModel @Inject constructor(
    private val serverConfig: ServerConfig
) : ViewModel() {

    fun getBaseURL(): String = serverConfig.baseURL
    fun getTenantID(): String = serverConfig.tenantID
    fun getAdminSecret(): String = serverConfig.adminSecret

    fun save(baseURL: String, tenantID: String, adminSecret: String) {
        serverConfig.baseURL = baseURL
        serverConfig.tenantID = tenantID
        serverConfig.adminSecret = adminSecret
    }
}
