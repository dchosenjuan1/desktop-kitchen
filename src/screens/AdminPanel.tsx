import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UtensilsCrossed,
  Package,
  Users,
  BarChart3,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { getSalesReport, getLowStock } from '../api';
import { SalesReport, InventoryItem } from '../types';
import { formatPrice } from '../utils/currency';

export default function AdminPanel() {
  const [dailyStats, setDailyStats] = useState<SalesReport | null>(null);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [stats, lowStock] = await Promise.all([
          getSalesReport('today'),
          getLowStock(),
        ]);
        setDailyStats(stats);
        setLowStockItems(lowStock);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
        <div className="flex items-center gap-4">
          <Link
            to="/pos"
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </Link>
          <img src="/logo.png" alt="Juanberto's" className="h-8" />
          <h1 className="text-3xl font-black tracking-tighter">Admin Panel</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 animate-pulse">
                <div className="h-20 bg-neutral-800 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <p className="text-neutral-400 text-sm font-medium">Today's Revenue</p>
              <p className="text-3xl font-bold text-red-500 mt-2">
                {formatPrice(dailyStats?.total_revenue || 0)}
              </p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <p className="text-neutral-400 text-sm font-medium">Orders</p>
              <p className="text-3xl font-bold text-white mt-2">
                {dailyStats?.order_count || 0}
              </p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <p className="text-neutral-400 text-sm font-medium">Avg Ticket</p>
              <p className="text-3xl font-bold text-white mt-2">
                {formatPrice(dailyStats?.avg_ticket || 0)}
              </p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <p className="text-neutral-400 text-sm font-medium">Total Tips</p>
              <p className="text-3xl font-bold text-white mt-2">
                {formatPrice(dailyStats?.tip_total || 0)}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link to="/admin/menu">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-red-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-red-600/10 rounded-lg mb-4">
                <UtensilsCrossed className="text-red-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Menu Management</h2>
              <p className="text-neutral-400 text-sm">Manage menu items, categories, and pricing</p>
            </div>
          </Link>

          <Link to="/admin/inventory">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-red-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-red-600/10 rounded-lg mb-4">
                <Package className="text-red-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Inventory</h2>
              <p className="text-neutral-400 text-sm">Track stock levels and restock items</p>
            </div>
          </Link>

          <Link to="/admin/employees">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-red-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-red-600/10 rounded-lg mb-4">
                <Users className="text-red-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Employees</h2>
              <p className="text-neutral-400 text-sm">Add, edit, and manage staff accounts</p>
            </div>
          </Link>

          <Link to="/admin/reports">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-red-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-red-600/10 rounded-lg mb-4">
                <BarChart3 className="text-red-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Reports</h2>
              <p className="text-neutral-400 text-sm">View sales reports and analytics</p>
            </div>
          </Link>

          <Link to="/admin/ai">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-red-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-red-600/10 rounded-lg mb-4">
                <Sparkles className="text-red-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">AI Intelligence</h2>
              <p className="text-neutral-400 text-sm">Smart upsells, inventory forecasting, and dynamic pricing</p>
            </div>
          </Link>
        </div>

        {lowStockItems.length > 0 && (
          <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-red-500" size={24} />
              <h3 className="text-xl font-bold text-white">Low Stock Alerts</h3>
            </div>
            <div className="space-y-3">
              {lowStockItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-900/40">
                  <div>
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="text-sm text-neutral-400">
                      {item.quantity} {item.unit} remaining
                    </p>
                  </div>
                  <Link
                    to="/admin/inventory"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Restock
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
