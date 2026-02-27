import Foundation

/// A JSONDecoder wrapper that handles Neon Postgres quirks:
/// - NUMERIC columns arrive as strings (e.g. "130.00") → coerced to Double/Int
/// - Numeric-looking strings like order_number stay as String
///
/// Instead of pre-processing raw JSON (which breaks string fields that look numeric),
/// we keep the JSON as-is and coerce only when decoding to a specific numeric type fails.
final class FlexibleJSONDecoder: @unchecked Sendable {
    func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        let decoder = try _FlexibleDecoder(data: data)
        return try T(from: decoder)
    }
}

// MARK: - Custom Decoder

private final class _FlexibleDecoder: Decoder {
    let json: Any
    var codingPath: [CodingKey] = []
    var userInfo: [CodingUserInfoKey: Any] = [:]

    init(data: Data) throws {
        self.json = try JSONSerialization.jsonObject(with: data, options: .fragmentsAllowed)
    }

    init(json: Any, codingPath: [CodingKey] = []) {
        self.json = json
        self.codingPath = codingPath
    }

    func container<Key: CodingKey>(keyedBy type: Key.Type) throws -> KeyedDecodingContainer<Key> {
        guard let dict = json as? [String: Any] else {
            throw DecodingError.typeMismatch([String: Any].self, .init(codingPath: codingPath, debugDescription: "Expected dictionary"))
        }
        return KeyedDecodingContainer(_FlexibleKeyedContainer<Key>(dict: dict, codingPath: codingPath))
    }

    func unkeyedContainer() throws -> UnkeyedDecodingContainer {
        guard let array = json as? [Any] else {
            throw DecodingError.typeMismatch([Any].self, .init(codingPath: codingPath, debugDescription: "Expected array"))
        }
        return _FlexibleUnkeyedContainer(array: array, codingPath: codingPath)
    }

    func singleValueContainer() throws -> SingleValueDecodingContainer {
        _FlexibleSingleValueContainer(value: json, codingPath: codingPath)
    }
}

// MARK: - Keyed Container

private struct _FlexibleKeyedContainer<Key: CodingKey>: KeyedDecodingContainerProtocol {
    let dict: [String: Any]
    var codingPath: [CodingKey]
    var allKeys: [Key] { dict.keys.compactMap { Key(stringValue: $0) } }

    func contains(_ key: Key) -> Bool { dict[key.stringValue] != nil }

    func decodeNil(forKey key: Key) throws -> Bool {
        guard let val = dict[key.stringValue] else { return true }
        return val is NSNull
    }

    func decode(_ type: Bool.Type, forKey key: Key) throws -> Bool {
        let val = try requireValue(forKey: key)
        if let b = val as? Bool { return b }
        if let n = val as? NSNumber { return n.boolValue }
        if let i = val as? Int { return i != 0 }
        throw typeMismatch(type, forKey: key)
    }

    func decode(_ type: String.Type, forKey key: Key) throws -> String {
        let val = try requireValue(forKey: key)
        if let s = val as? String { return s }
        // Coerce number → string (e.g. if JSON has a raw number for order_number)
        if let n = val as? NSNumber { return n.stringValue }
        throw typeMismatch(type, forKey: key)
    }

    func decode(_ type: Double.Type, forKey key: Key) throws -> Double {
        let val = try requireValue(forKey: key)
        if let d = val as? Double { return d }
        if let n = val as? NSNumber { return n.doubleValue }
        // Coerce string → number (Neon NUMERIC columns)
        if let s = val as? String, let d = Double(s) { return d }
        throw typeMismatch(type, forKey: key)
    }

    func decode(_ type: Float.Type, forKey key: Key) throws -> Float {
        Float(try decode(Double.self, forKey: key))
    }

    func decode(_ type: Int.Type, forKey key: Key) throws -> Int {
        let val = try requireValue(forKey: key)
        if let i = val as? Int { return i }
        if let n = val as? NSNumber { return n.intValue }
        if let s = val as? String, let i = Int(s) { return i }
        throw typeMismatch(type, forKey: key)
    }

    func decode(_ type: Int8.Type, forKey key: Key) throws -> Int8 { Int8(try decode(Int.self, forKey: key)) }
    func decode(_ type: Int16.Type, forKey key: Key) throws -> Int16 { Int16(try decode(Int.self, forKey: key)) }
    func decode(_ type: Int32.Type, forKey key: Key) throws -> Int32 { Int32(try decode(Int.self, forKey: key)) }
    func decode(_ type: Int64.Type, forKey key: Key) throws -> Int64 { Int64(try decode(Int.self, forKey: key)) }
    func decode(_ type: UInt.Type, forKey key: Key) throws -> UInt { UInt(try decode(Int.self, forKey: key)) }
    func decode(_ type: UInt8.Type, forKey key: Key) throws -> UInt8 { UInt8(try decode(Int.self, forKey: key)) }
    func decode(_ type: UInt16.Type, forKey key: Key) throws -> UInt16 { UInt16(try decode(Int.self, forKey: key)) }
    func decode(_ type: UInt32.Type, forKey key: Key) throws -> UInt32 { UInt32(try decode(Int.self, forKey: key)) }
    func decode(_ type: UInt64.Type, forKey key: Key) throws -> UInt64 { UInt64(try decode(Int.self, forKey: key)) }

    func decode<T: Decodable>(_ type: T.Type, forKey key: Key) throws -> T {
        let val = try requireValue(forKey: key)
        let decoder = _FlexibleDecoder(json: val, codingPath: codingPath + [key])
        return try T(from: decoder)
    }

    func decodeIfPresent<T: Decodable>(_ type: T.Type, forKey key: Key) throws -> T? {
        guard let val = dict[key.stringValue], !(val is NSNull) else { return nil }
        let decoder = _FlexibleDecoder(json: val, codingPath: codingPath + [key])
        return try T(from: decoder)
    }

    func nestedContainer<NestedKey: CodingKey>(keyedBy type: NestedKey.Type, forKey key: Key) throws -> KeyedDecodingContainer<NestedKey> {
        let val = try requireValue(forKey: key)
        guard let dict = val as? [String: Any] else { throw typeMismatch([String: Any].self, forKey: key) }
        return KeyedDecodingContainer(_FlexibleKeyedContainer<NestedKey>(dict: dict, codingPath: codingPath + [key]))
    }

    func nestedUnkeyedContainer(forKey key: Key) throws -> UnkeyedDecodingContainer {
        let val = try requireValue(forKey: key)
        guard let array = val as? [Any] else { throw typeMismatch([Any].self, forKey: key) }
        return _FlexibleUnkeyedContainer(array: array, codingPath: codingPath + [key])
    }

    func superDecoder() throws -> Decoder { _FlexibleDecoder(json: dict, codingPath: codingPath) }
    func superDecoder(forKey key: Key) throws -> Decoder {
        let val = try requireValue(forKey: key)
        return _FlexibleDecoder(json: val, codingPath: codingPath + [key])
    }

    private func requireValue(forKey key: Key) throws -> Any {
        guard let val = dict[key.stringValue] else {
            throw DecodingError.keyNotFound(key, .init(codingPath: codingPath, debugDescription: "No value for key '\(key.stringValue)'"))
        }
        if val is NSNull {
            throw DecodingError.valueNotFound(Any.self, .init(codingPath: codingPath + [key], debugDescription: "null value for '\(key.stringValue)'"))
        }
        return val
    }

    private func typeMismatch<T>(_ type: T.Type, forKey key: Key) -> DecodingError {
        DecodingError.typeMismatch(type, .init(codingPath: codingPath + [key], debugDescription: "Type mismatch for \(type) at \(key.stringValue)"))
    }
}

// MARK: - Unkeyed Container

private struct _FlexibleUnkeyedContainer: UnkeyedDecodingContainer {
    let array: [Any]
    var codingPath: [CodingKey]
    var count: Int? { array.count }
    var isAtEnd: Bool { currentIndex >= array.count }
    var currentIndex: Int = 0

    private struct IndexKey: CodingKey {
        var intValue: Int?
        var stringValue: String
        init(index: Int) { self.intValue = index; self.stringValue = "\(index)" }
        init?(stringValue: String) { return nil }
        init?(intValue: Int) { self.intValue = intValue; self.stringValue = "\(intValue)" }
    }

    mutating func decodeNil() throws -> Bool {
        guard !isAtEnd else { throw outOfBounds() }
        let isNull = array[currentIndex] is NSNull
        if isNull { currentIndex += 1 }
        return isNull
    }

    mutating func decode(_ type: Bool.Type) throws -> Bool {
        let val = try nextValue()
        if let b = val as? Bool { return b }
        if let n = val as? NSNumber { return n.boolValue }
        throw typeMismatch(type)
    }

    mutating func decode(_ type: String.Type) throws -> String {
        let val = try nextValue()
        if let s = val as? String { return s }
        if let n = val as? NSNumber { return n.stringValue }
        throw typeMismatch(type)
    }

    mutating func decode(_ type: Double.Type) throws -> Double {
        let val = try nextValue()
        if let d = val as? Double { return d }
        if let n = val as? NSNumber { return n.doubleValue }
        if let s = val as? String, let d = Double(s) { return d }
        throw typeMismatch(type)
    }

    mutating func decode(_ type: Float.Type) throws -> Float { Float(try decode(Double.self)) }

    mutating func decode(_ type: Int.Type) throws -> Int {
        let val = try nextValue()
        if let i = val as? Int { return i }
        if let n = val as? NSNumber { return n.intValue }
        if let s = val as? String, let i = Int(s) { return i }
        throw typeMismatch(type)
    }

    mutating func decode(_ type: Int8.Type) throws -> Int8 { Int8(try decode(Int.self)) }
    mutating func decode(_ type: Int16.Type) throws -> Int16 { Int16(try decode(Int.self)) }
    mutating func decode(_ type: Int32.Type) throws -> Int32 { Int32(try decode(Int.self)) }
    mutating func decode(_ type: Int64.Type) throws -> Int64 { Int64(try decode(Int.self)) }
    mutating func decode(_ type: UInt.Type) throws -> UInt { UInt(try decode(Int.self)) }
    mutating func decode(_ type: UInt8.Type) throws -> UInt8 { UInt8(try decode(Int.self)) }
    mutating func decode(_ type: UInt16.Type) throws -> UInt16 { UInt16(try decode(Int.self)) }
    mutating func decode(_ type: UInt32.Type) throws -> UInt32 { UInt32(try decode(Int.self)) }
    mutating func decode(_ type: UInt64.Type) throws -> UInt64 { UInt64(try decode(Int.self)) }

    mutating func decode<T: Decodable>(_ type: T.Type) throws -> T {
        let val = try nextValue()
        let decoder = _FlexibleDecoder(json: val, codingPath: codingPath + [IndexKey(index: currentIndex - 1)])
        return try T(from: decoder)
    }

    mutating func nestedContainer<NestedKey: CodingKey>(keyedBy type: NestedKey.Type) throws -> KeyedDecodingContainer<NestedKey> {
        let val = try nextValue()
        guard let dict = val as? [String: Any] else { throw typeMismatch([String: Any].self) }
        return KeyedDecodingContainer(_FlexibleKeyedContainer<NestedKey>(dict: dict, codingPath: codingPath + [IndexKey(index: currentIndex - 1)]))
    }

    mutating func nestedUnkeyedContainer() throws -> UnkeyedDecodingContainer {
        let val = try nextValue()
        guard let arr = val as? [Any] else { throw typeMismatch([Any].self) }
        return _FlexibleUnkeyedContainer(array: arr, codingPath: codingPath + [IndexKey(index: currentIndex - 1)])
    }

    mutating func superDecoder() throws -> Decoder {
        let val = try nextValue()
        return _FlexibleDecoder(json: val, codingPath: codingPath + [IndexKey(index: currentIndex - 1)])
    }

    private mutating func nextValue() throws -> Any {
        guard !isAtEnd else { throw outOfBounds() }
        let val = array[currentIndex]
        currentIndex += 1
        if val is NSNull {
            throw DecodingError.valueNotFound(Any.self, .init(codingPath: codingPath + [IndexKey(index: currentIndex - 1)], debugDescription: "null"))
        }
        return val
    }

    private func outOfBounds() -> DecodingError {
        DecodingError.dataCorrupted(.init(codingPath: codingPath, debugDescription: "Index out of bounds"))
    }

    private func typeMismatch<T>(_ type: T.Type) -> DecodingError {
        DecodingError.typeMismatch(type, .init(codingPath: codingPath + [IndexKey(index: currentIndex)], debugDescription: "Type mismatch"))
    }
}

// MARK: - Single Value Container

private struct _FlexibleSingleValueContainer: SingleValueDecodingContainer {
    let value: Any
    var codingPath: [CodingKey]

    func decodeNil() -> Bool { value is NSNull }

    func decode(_ type: Bool.Type) throws -> Bool {
        if let b = value as? Bool { return b }
        if let n = value as? NSNumber { return n.boolValue }
        throw typeMismatch(type)
    }

    func decode(_ type: String.Type) throws -> String {
        if let s = value as? String { return s }
        if let n = value as? NSNumber { return n.stringValue }
        throw typeMismatch(type)
    }

    func decode(_ type: Double.Type) throws -> Double {
        if let d = value as? Double { return d }
        if let n = value as? NSNumber { return n.doubleValue }
        if let s = value as? String, let d = Double(s) { return d }
        throw typeMismatch(type)
    }

    func decode(_ type: Float.Type) throws -> Float { Float(try decode(Double.self)) }

    func decode(_ type: Int.Type) throws -> Int {
        if let i = value as? Int { return i }
        if let n = value as? NSNumber { return n.intValue }
        if let s = value as? String, let i = Int(s) { return i }
        throw typeMismatch(type)
    }

    func decode(_ type: Int8.Type) throws -> Int8 { Int8(try decode(Int.self)) }
    func decode(_ type: Int16.Type) throws -> Int16 { Int16(try decode(Int.self)) }
    func decode(_ type: Int32.Type) throws -> Int32 { Int32(try decode(Int.self)) }
    func decode(_ type: Int64.Type) throws -> Int64 { Int64(try decode(Int.self)) }
    func decode(_ type: UInt.Type) throws -> UInt { UInt(try decode(Int.self)) }
    func decode(_ type: UInt8.Type) throws -> UInt8 { UInt8(try decode(Int.self)) }
    func decode(_ type: UInt16.Type) throws -> UInt16 { UInt16(try decode(Int.self)) }
    func decode(_ type: UInt32.Type) throws -> UInt32 { UInt32(try decode(Int.self)) }
    func decode(_ type: UInt64.Type) throws -> UInt64 { UInt64(try decode(Int.self)) }

    func decode<T: Decodable>(_ type: T.Type) throws -> T {
        // Handle URL, Date, Data as special cases using standard decoder
        if type == URL.self, let s = value as? String, let url = URL(string: s) {
            return url as! T
        }
        let decoder = _FlexibleDecoder(json: value, codingPath: codingPath)
        return try T(from: decoder)
    }

    private func typeMismatch<T>(_ type: T.Type) -> DecodingError {
        DecodingError.typeMismatch(type, .init(codingPath: codingPath, debugDescription: "Type mismatch for \(type)"))
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
