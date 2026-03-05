using System.Text.Json;
using System.Text.Json.Serialization;

namespace DesktopKitchenPOS.Networking;

/// <summary>
/// Handles Postgres NUMERIC columns that arrive as strings.
/// Coerces string→double, int→double, null→0.0
/// </summary>
public class FlexibleDoubleConverter : JsonConverter<double>
{
    public override double Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        return reader.TokenType switch
        {
            JsonTokenType.String => double.TryParse(reader.GetString(), out var d) ? d : 0.0,
            JsonTokenType.Number => reader.GetDouble(),
            JsonTokenType.Null => 0.0,
            _ => 0.0
        };
    }

    public override void Write(Utf8JsonWriter writer, double value, JsonSerializerOptions options)
    {
        writer.WriteNumberValue(value);
    }
}

/// <summary>
/// Handles int↔string coercion from Postgres.
/// </summary>
public class FlexibleIntConverter : JsonConverter<int>
{
    public override int Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        return reader.TokenType switch
        {
            JsonTokenType.String => int.TryParse(reader.GetString(), out var i) ? i :
                                    double.TryParse(reader.GetString(), out var d) ? (int)d : 0,
            JsonTokenType.Number => reader.TryGetInt32(out var i) ? i : (int)reader.GetDouble(),
            JsonTokenType.Null => 0,
            _ => 0
        };
    }

    public override void Write(Utf8JsonWriter writer, int value, JsonSerializerOptions options)
    {
        writer.WriteNumberValue(value);
    }
}

/// <summary>
/// Handles bool↔int coercion (Postgres returns booleans as 0/1).
/// </summary>
public class FlexibleBoolConverter : JsonConverter<bool>
{
    public override bool Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        return reader.TokenType switch
        {
            JsonTokenType.True => true,
            JsonTokenType.False => false,
            JsonTokenType.Number => reader.GetInt32() != 0,
            JsonTokenType.String => reader.GetString() is "true" or "1",
            _ => false
        };
    }

    public override void Write(Utf8JsonWriter writer, bool value, JsonSerializerOptions options)
    {
        writer.WriteBooleanValue(value);
    }
}

/// <summary>
/// Handles nullable double fields from Postgres (null → null, string → double).
/// </summary>
public class FlexibleNullableDoubleConverter : JsonConverter<double?>
{
    public override double? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        return reader.TokenType switch
        {
            JsonTokenType.String => double.TryParse(reader.GetString(), out var d) ? d : null,
            JsonTokenType.Number => reader.GetDouble(),
            JsonTokenType.Null => null,
            _ => null
        };
    }

    public override void Write(Utf8JsonWriter writer, double? value, JsonSerializerOptions options)
    {
        if (value.HasValue) writer.WriteNumberValue(value.Value);
        else writer.WriteNullValue();
    }
}

/// <summary>
/// Handles nullable int fields from Postgres.
/// </summary>
public class FlexibleNullableIntConverter : JsonConverter<int?>
{
    public override int? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        return reader.TokenType switch
        {
            JsonTokenType.String => int.TryParse(reader.GetString(), out var i) ? i : null,
            JsonTokenType.Number => reader.TryGetInt32(out var i) ? i : null,
            JsonTokenType.Null => null,
            _ => null
        };
    }

    public override void Write(Utf8JsonWriter writer, int? value, JsonSerializerOptions options)
    {
        if (value.HasValue) writer.WriteNumberValue(value.Value);
        else writer.WriteNullValue();
    }
}
