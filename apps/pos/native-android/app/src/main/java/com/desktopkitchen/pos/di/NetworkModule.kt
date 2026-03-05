package com.desktopkitchen.pos.di

import com.desktopkitchen.pos.configuration.ServerConfig
import com.desktopkitchen.pos.networking.FlexibleBooleanAdapter
import com.desktopkitchen.pos.networking.FlexibleDoubleAdapter
import com.desktopkitchen.pos.networking.FlexibleIntAdapter
import com.desktopkitchen.pos.networking.HeaderInterceptor
import com.desktopkitchen.pos.networking.api.AuthApi
import com.desktopkitchen.pos.networking.api.BrandingApi
import com.desktopkitchen.pos.networking.api.MenuApi
import com.desktopkitchen.pos.networking.api.ModifierApi
import com.desktopkitchen.pos.networking.api.OrderApi
import com.desktopkitchen.pos.networking.api.PaymentApi
import com.desktopkitchen.pos.networking.api.ReportApi
import com.squareup.moshi.Moshi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideMoshi(): Moshi = Moshi.Builder()
        .add(Double::class.java, FlexibleDoubleAdapter())
        .add(Int::class.java, FlexibleIntAdapter())
        .add(Boolean::class.java, FlexibleBooleanAdapter())
        .build()

    @Provides
    @Singleton
    fun provideOkHttpClient(headerInterceptor: HeaderInterceptor): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        return OkHttpClient.Builder()
            .addInterceptor(headerInterceptor)
            .addInterceptor(logging)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient, moshi: Moshi, serverConfig: ServerConfig): Retrofit =
        Retrofit.Builder()
            .baseUrl(serverConfig.baseURL + "/")
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()

    @Provides @Singleton
    fun provideAuthApi(retrofit: Retrofit): AuthApi = retrofit.create(AuthApi::class.java)

    @Provides @Singleton
    fun provideMenuApi(retrofit: Retrofit): MenuApi = retrofit.create(MenuApi::class.java)

    @Provides @Singleton
    fun provideOrderApi(retrofit: Retrofit): OrderApi = retrofit.create(OrderApi::class.java)

    @Provides @Singleton
    fun providePaymentApi(retrofit: Retrofit): PaymentApi = retrofit.create(PaymentApi::class.java)

    @Provides @Singleton
    fun provideReportApi(retrofit: Retrofit): ReportApi = retrofit.create(ReportApi::class.java)

    @Provides @Singleton
    fun provideBrandingApi(retrofit: Retrofit): BrandingApi = retrofit.create(BrandingApi::class.java)

    @Provides @Singleton
    fun provideModifierApi(retrofit: Retrofit): ModifierApi = retrofit.create(ModifierApi::class.java)
}
