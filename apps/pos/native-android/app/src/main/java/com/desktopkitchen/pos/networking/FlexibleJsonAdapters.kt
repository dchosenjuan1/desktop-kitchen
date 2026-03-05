package com.desktopkitchen.pos.networking

import com.squareup.moshi.FromJson
import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.JsonReader
import com.squareup.moshi.JsonWriter
import com.squareup.moshi.ToJson

/**
 * Handles Postgres NUMERIC columns that arrive as strings.
 * Coerces string→double, int→double, null→0.0
 */
class FlexibleDoubleAdapter : JsonAdapter<Double>() {
    @FromJson
    override fun fromJson(reader: JsonReader): Double {
        return when (reader.peek()) {
            JsonReader.Token.STRING -> {
                val s = reader.nextString()
                s.toDoubleOrNull() ?: 0.0
            }
            JsonReader.Token.NUMBER -> reader.nextDouble()
            JsonReader.Token.NULL -> {
                reader.nextNull<Unit>()
                0.0
            }
            else -> {
                reader.skipValue()
                0.0
            }
        }
    }

    @ToJson
    override fun toJson(writer: JsonWriter, value: Double?) {
        writer.value(value ?: 0.0)
    }
}

/**
 * Handles int↔string coercion (Postgres sometimes returns ints as strings).
 */
class FlexibleIntAdapter : JsonAdapter<Int>() {
    @FromJson
    override fun fromJson(reader: JsonReader): Int {
        return when (reader.peek()) {
            JsonReader.Token.STRING -> {
                val s = reader.nextString()
                s.toIntOrNull() ?: s.toDoubleOrNull()?.toInt() ?: 0
            }
            JsonReader.Token.NUMBER -> reader.nextInt()
            JsonReader.Token.NULL -> {
                reader.nextNull<Unit>()
                0
            }
            else -> {
                reader.skipValue()
                0
            }
        }
    }

    @ToJson
    override fun toJson(writer: JsonWriter, value: Int?) {
        writer.value(value ?: 0)
    }
}

/**
 * Handles bool↔int coercion (Postgres returns booleans as 0/1 integers).
 */
class FlexibleBooleanAdapter : JsonAdapter<Boolean>() {
    @FromJson
    override fun fromJson(reader: JsonReader): Boolean {
        return when (reader.peek()) {
            JsonReader.Token.BOOLEAN -> reader.nextBoolean()
            JsonReader.Token.NUMBER -> reader.nextInt() != 0
            JsonReader.Token.STRING -> {
                val s = reader.nextString()
                s == "true" || s == "1"
            }
            JsonReader.Token.NULL -> {
                reader.nextNull<Unit>()
                false
            }
            else -> {
                reader.skipValue()
                false
            }
        }
    }

    @ToJson
    override fun toJson(writer: JsonWriter, value: Boolean?) {
        writer.value(value ?: false)
    }
}
