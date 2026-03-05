package com.desktopkitchen.pos.networking

import java.util.concurrent.atomic.AtomicReference

object AuthTokenStore {
    private val _token = AtomicReference<String?>(null)

    var token: String?
        get() = _token.get()
        set(value) = _token.set(value)
}
