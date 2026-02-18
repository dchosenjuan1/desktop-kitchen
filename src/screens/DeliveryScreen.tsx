import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Truck, RefreshCw } from 'lucide-react';
import {
  getDeliveryPlatforms,
  updateDeliveryPlatform,
  getDeliveryOrders,
  updateDeliveryOrderStatus,
} from '../api';
import { DeliveryPlatform, DeliveryOrder } from '../types';
import { formatPrice } from '../utils/currency';

export default function DeliveryScreen() {
  const { t } = useTranslation('inventory');
  const [platforms, setPlatforms] = useState<DeliveryPlatform[]>([]);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'platforms' | 'orders'>('orders');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [platformsData, ordersData] = await Promise.all([
        getDeliveryPlatforms(),
        getDeliveryOrders(),
      ]);
      setPlatforms(platformsData);
      setOrders(ordersData);
    } catch (err) {
      console.error('Failed to load delivery data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlatform = async (platform: DeliveryPlatform) => {
    try {
      await updateDeliveryPlatform(platform.id, { active: !platform.active });
      fetchData();
    } catch (err) {
      console.error('Failed to toggle platform:', err);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      await updateDeliveryOrderStatus(orderId, status);
      fetchData();
    } catch (err) {
      console.error('Failed to update delivery order:', err);
    }
  };

  const getPlatformColor = (name: string) => {
    switch (name) {
      case 'uber_eats': return 'bg-green-600';
      case 'rappi': return 'bg-orange-500';
      case 'didi_food': return 'bg-orange-600';
      default: return 'bg-neutral-600';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <img src="/logo.png" alt="Juanberto's" className="h-8" />
          <h1 className="text-3xl font-black tracking-tighter">{t('delivery.title')}</h1>
          <button
            onClick={fetchData}
            className="ml-auto p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setTab('orders')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              tab === 'orders' ? 'bg-red-600 text-white' : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
            }`}
          >
            {t('delivery.tabs.orders')}
          </button>
          <button
            onClick={() => setTab('platforms')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              tab === 'platforms' ? 'bg-red-600 text-white' : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
            }`}
          >
            {t('delivery.tabs.config')}
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-neutral-900 rounded-lg border border-neutral-800 animate-pulse" />
            ))}
          </div>
        ) : tab === 'orders' ? (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-12 text-center">
                <Truck size={48} className="mx-auto text-neutral-600 mb-4" />
                <p className="text-neutral-400 text-lg">{t('delivery.noOrders')}</p>
                <p className="text-neutral-500 text-sm mt-1">{t('delivery.ordersHint')}</p>
              </div>
            ) : (
              orders.map((order: any) => (
                <div key={order.id} className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${getPlatformColor(order.platform_name?.toLowerCase().replace(/\s/g, '_'))}`}>
                          {order.platform_name}
                        </span>
                        <span className="text-white font-bold">{t('delivery.orderNumber', { number: order.order_number })}</span>
                      </div>
                      <p className="text-neutral-400 text-sm">{order.customer_name}</p>
                      {order.delivery_address && (
                        <p className="text-neutral-500 text-xs mt-1">{order.delivery_address}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-500">{formatPrice(order.total || 0)}</p>
                      <p className="text-xs text-neutral-500">{order.platform_status}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {order.platform_status === 'received' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg font-medium hover:bg-green-700"
                      >
                        {t('delivery.actions.confirm')}
                      </button>
                    )}
                    {order.platform_status === 'confirmed' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'ready_for_pickup')}
                        className="px-3 py-1 bg-amber-600 text-white text-sm rounded-lg font-medium hover:bg-amber-700"
                      >
                        {t('delivery.actions.readyForPickup')}
                      </button>
                    )}
                    {order.platform_status === 'ready_for_pickup' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'picked_up')}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700"
                      >
                        {t('delivery.actions.pickedUp')}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {platforms.map((platform) => (
              <div key={platform.id} className={`bg-neutral-900 rounded-lg border border-neutral-800 p-6 ${!platform.active ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">{platform.display_name}</h3>
                    <p className="text-neutral-400 text-sm mt-1">
                      {t('delivery.commission')} {platform.commission_percent}%
                    </p>
                  </div>
                  <button
                    onClick={() => handleTogglePlatform(platform)}
                    className={`px-4 py-2 rounded-lg font-medium ${platform.active ? 'bg-green-900/30 text-green-400' : 'bg-neutral-800 text-neutral-500'}`}
                  >
                    {platform.active ? t('delivery.active') : t('delivery.inactive')}
                  </button>
                </div>
              </div>
            ))}
            {platforms.length === 0 && (
              <p className="text-neutral-500 text-center py-6">{t('delivery.noPlatforms')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
