package com.desktopkitchen.pos.utilities

import java.text.NumberFormat
import java.util.Locale

object CurrencyFormatter {
    const val TAX_RATE = 0.16
    const val TAX_LABEL = "IVA (16%)"

    private val formatter = NumberFormat.getCurrencyInstance(Locale("es", "MX")).apply {
        minimumFractionDigits = 2
        maximumFractionDigits = 2
    }

    fun format(amount: Double): String = formatter.format(amount)

    fun formatShort(amount: Double): String = String.format(Locale.US, "$%.2f", amount)

    /** Extract IVA from a tax-inclusive total (Mexican pricing). */
    fun extractTax(fromTotal: Double): Double {
        val raw = fromTotal - fromTotal / (1 + TAX_RATE)
        return Math.round(raw * 100.0) / 100.0
    }

    /** Extract the pre-tax subtotal from a tax-inclusive total. */
    fun extractSubtotal(fromTotal: Double): Double {
        val raw = fromTotal / (1 + TAX_RATE)
        return Math.round(raw * 100.0) / 100.0
    }
}
