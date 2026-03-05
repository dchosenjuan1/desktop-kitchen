package com.desktopkitchen.pos.ui.theme

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color

object AppColors {
    // Backgrounds
    val background = Color(0xFF0A0A0A)   // neutral-950
    val card = Color(0xFF171717)          // neutral-900
    val cardHover = Color(0xFF1C1C1C)
    val surface = Color(0xFF262626)       // neutral-800

    // Borders
    val border = Color(0xFF262626)        // neutral-800
    val borderLight = Color(0xFF404040)   // neutral-700

    // Accent — dynamically overridable via branding
    var accent by mutableStateOf(Color(0xFFDC2626))       // red-600
    var accentDark by mutableStateOf(Color(0xFFB91C1C))   // red-700
    var accentLight by mutableStateOf(Color(0xFFEF4444))  // red-500

    // Text
    val textPrimary = Color.White
    val textSecondary = Color(0xFFA3A3A3) // neutral-400
    val textTertiary = Color(0xFF737373)  // neutral-500
    val textMuted = Color(0xFF525252)     // neutral-600

    // Status
    val success = Color(0xFF16A34A)       // green-600
    val successLight = Color(0xFF4ADE80)  // green-400
    val warning = Color(0xFFF59E0B)       // amber-500
    val warningLight = Color(0xFFFBBF24)  // amber-400
    val error = Color(0xFFDC2626)         // red-600
    val info = Color(0xFF2563EB)          // blue-600

    // Role badges
    val roleAdmin = Color(0xFFDC2626)
    val roleManager = Color(0xFF9333EA)
    val roleKitchen = Color(0xFF2563EB)
    val roleCashier = Color(0xFF16A34A)

    fun applyBranding(hex: String) {
        val rgb = parseHex(hex) ?: return
        accent = rgb
        accentDark = Color(
            red = (rgb.red * 0.8f).coerceIn(0f, 1f),
            green = (rgb.green * 0.8f).coerceIn(0f, 1f),
            blue = (rgb.blue * 0.8f).coerceIn(0f, 1f)
        )
        accentLight = Color(
            red = (rgb.red * 1.2f).coerceIn(0f, 1f),
            green = (rgb.green * 1.2f).coerceIn(0f, 1f),
            blue = (rgb.blue * 1.2f).coerceIn(0f, 1f)
        )
    }

    private fun parseHex(hex: String): Color? {
        val cleaned = hex.trimStart('#')
        if (cleaned.length != 6) return null
        val value = cleaned.toLongOrNull(16) ?: return null
        return Color(
            red = ((value shr 16) and 0xFF) / 255f,
            green = ((value shr 8) and 0xFF) / 255f,
            blue = (value and 0xFF) / 255f
        )
    }
}
