import Foundation

/// A JSONDecoder that coerces JSON string values to numbers where needed.
/// Handles Neon Postgres NUMERIC columns that arrive as strings (e.g. "130.00").
final class FlexibleJSONDecoder: @unchecked Sendable {
    private let decoder = JSONDecoder()

    func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        let coerced = try Self.coerceStringsToNumbers(in: data)
        return try decoder.decode(type, from: coerced)
    }

    /// Recursively walk the JSON and convert string values that look like numbers into actual numbers.
    private static func coerceStringsToNumbers(in data: Data) throws -> Data {
        let json = try JSONSerialization.jsonObject(with: data, options: .fragmentsAllowed)
        let coerced = coerce(json)
        return try JSONSerialization.data(withJSONObject: coerced, options: [])
    }

    private static func coerce(_ value: Any) -> Any {
        switch value {
        case let dict as [String: Any]:
            return dict.mapValues { coerce($0) }
        case let array as [Any]:
            return array.map { coerce($0) }
        case let string as String:
            // Try to convert numeric-looking strings to NSNumber
            if let doubleVal = Double(string), !string.isEmpty,
               string.first?.isNumber == true || string.first == "-" {
                // Preserve integer representation when possible
                if !string.contains("."), let intVal = Int(string) {
                    return NSNumber(value: intVal)
                }
                return NSNumber(value: doubleVal)
            }
            return string
        default:
            return value
        }
    }
}

/// Helpers for models that use custom init(from:) decoders.
extension KeyedDecodingContainer {
    func flexibleDouble(forKey key: Key) throws -> Double {
        if let value = try? decode(Double.self, forKey: key) {
            return value
        }
        if let str = try? decode(String.self, forKey: key), let value = Double(str) {
            return value
        }
        return 0
    }

    func flexibleDoubleIfPresent(forKey key: Key) throws -> Double? {
        if let value = try? decode(Double.self, forKey: key) {
            return value
        }
        if let str = try? decode(String.self, forKey: key), let value = Double(str) {
            return value
        }
        return nil
    }

    func flexibleInt(forKey key: Key) throws -> Int {
        if let value = try? decode(Int.self, forKey: key) {
            return value
        }
        if let str = try? decode(String.self, forKey: key), let value = Int(str) {
            return value
        }
        return 0
    }
}
