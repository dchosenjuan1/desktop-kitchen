package com.desktopkitchen.pos.networking

sealed class ApiError : Exception() {
    data class HttpError(val statusCode: Int, override val message: String) : ApiError()
    data class NetworkError(override val cause: Throwable) : ApiError() {
        override val message: String get() = cause.message ?: "Network error"
    }
    data class DecodingError(override val cause: Throwable) : ApiError() {
        override val message: String get() = cause.message ?: "Decoding error"
    }
    data object Unknown : ApiError() {
        override val message: String get() = "Unknown error"
    }
}
