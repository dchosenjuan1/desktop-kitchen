package com.desktopkitchen.pos.configuration

import android.content.Context
import android.content.SharedPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ServerConfig @Inject constructor(
    @ApplicationContext context: Context
) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("server_config", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_BASE_URL = "server_base_url"
        private const val KEY_TENANT_ID = "tenant_id"
        private const val KEY_ADMIN_SECRET = "admin_secret"
        private const val DEFAULT_URL = "https://pos.desktop.kitchen"
        private const val DEFAULT_TENANT = "juanbertos"
    }

    var baseURL: String
        get() = stripApiPath(prefs.getString(KEY_BASE_URL, DEFAULT_URL) ?: DEFAULT_URL)
        set(value) = prefs.edit().putString(KEY_BASE_URL, stripApiPath(value)).apply()

    var tenantID: String
        get() = prefs.getString(KEY_TENANT_ID, DEFAULT_TENANT) ?: DEFAULT_TENANT
        set(value) = prefs.edit().putString(KEY_TENANT_ID, value).apply()

    var adminSecret: String
        get() = prefs.getString(KEY_ADMIN_SECRET, "") ?: ""
        set(value) = prefs.edit().putString(KEY_ADMIN_SECRET, value).apply()

    fun reset() {
        baseURL = DEFAULT_URL
        tenantID = DEFAULT_TENANT
        adminSecret = ""
    }

    private fun stripApiPath(url: String): String {
        var u = url.trimEnd('/')
        if (u.endsWith("/api")) u = u.dropLast(4)
        return u
    }
}
