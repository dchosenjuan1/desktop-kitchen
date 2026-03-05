package com.desktopkitchen.pos.di

import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

/**
 * Repository bindings for Hilt DI.
 * Currently all services are concrete classes with @Inject constructors,
 * so no explicit bindings are needed. This module is a placeholder for
 * future interface→impl bindings if services are abstracted.
 */
@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule
