package com.desktopkitchen.pos.utilities

import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

object DateFormatters {
    private val isoParser = DateTimeFormatter.ISO_DATE_TIME

    fun parseISO(dateString: String): Instant? {
        return try {
            Instant.from(isoParser.parse(dateString))
        } catch (e: DateTimeParseException) {
            try {
                Instant.parse(dateString)
            } catch (e2: Exception) {
                null
            }
        }
    }

    fun elapsedSeconds(from: String): Int {
        val instant = parseISO(from) ?: return 0
        return ((System.currentTimeMillis() - instant.toEpochMilli()) / 1000).toInt()
    }

    fun formatElapsed(seconds: Int): String {
        val mins = seconds / 60
        val secs = seconds % 60
        return if (mins > 0) "${mins}m ${secs}s" else "${secs}s"
    }

    fun formatTime(dateString: String): String {
        val instant = parseISO(dateString) ?: return ""
        val localTime = instant.atZone(ZoneId.systemDefault()).toLocalTime()
        val hour = if (localTime.hour % 12 == 0) 12 else localTime.hour % 12
        val ampm = if (localTime.hour < 12) "AM" else "PM"
        return String.format("%d:%02d %s", hour, localTime.minute, ampm)
    }
}
