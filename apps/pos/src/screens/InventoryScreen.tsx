import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  AlertCircle,
  Edit2,
  Check,
  X,
  Sparkles,
  ClipboardList,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  ScanLine,
  Trash2,
  Camera,
  CameraOff,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Brain,
  ChevronDown,
  ChevronRight,
  Lock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  getInventory,
  restockItem,
  updateInventory,
  getInventoryForecast,
  recordInventoryCount,
  getInventoryCounts,
  getVarianceReport,
  getShrinkageAlerts,
  acknowledgeShrinkageAlert,
  lookupInventoryItem,
  scanRestock,
  logWaste,
  getWasteLog,
  getWasteReport,
  getCOGSSummary,
  getInventoryInsights,
} from '../api';
import {
  InventoryItem,
  InventoryForecast,
  InventoryCount,
  ShrinkageAlert,
  VarianceReport,
  WasteLogEntry,
  WasteReport,
  COGSSummary,
  ScanSession,
  InventoryInsights,
} from '../types';
import { formatDate, formatDateTime } from '../utils/dateFormat';
import BrandLogo from '../components/BrandLogo';
import { usePlan } from '../context/PlanContext';

type Tab = 'stock' | 'scan' | 'waste' | 'count' | 'variance' | 'alerts' | 'insights';
type SortField = 'name' | 'quantity' | 'status';

export default function InventoryScreen() {
  const { t } = useTranslation('inventory');
  const { limits } = usePlan();
  const [activeTab, setActiveTab] = useState<Tab>('stock');

  // Stock tab state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [restockingId, setRestockingId] = useState<number | null>(null);
  const [restockAmount, setRestockAmount] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editThreshold, setEditThreshold] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [forecasts, setForecasts] = useState<InventoryForecast[]>([]);
  const [showForecasts, setShowForecasts] = useState(false);

  // COGS widget state
  const [cogsSummary, setCogsSummary] = useState<COGSSummary | null>(null);
  const [cogsLoading, setCogsLoading] = useState(false);

  // Scan tab state
  const [scanInput, setScanInput] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [scanRestockQty, setScanRestockQty] = useState('');
  const [scanCostPrice, setScanCostPrice] = useState('');
  const [scanSession, setScanSession] = useState<ScanSession[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Waste tab state
  const [wasteItemId, setWasteItemId] = useState('');
  const [wasteQty, setWasteQty] = useState('');
  const [wasteReason, setWasteReason] = useState<string>('spoilage');
  const [wasteNotes, setWasteNotes] = useState('');
  const [wasteLoading, setWasteLoading] = useState(false);
  const [wasteEntries, setWasteEntries] = useState<WasteLogEntry[]>([]);
  const [wasteReport, setWasteReport] = useState<WasteReport | null>(null);
  const [wasteReportLoading, setWasteReportLoading] = useState(false);
  const [wasteAlerts, setWasteAlerts] = useState<any[]>([]);

  // Count tab state
  const [countItemId, setCountItemId] = useState<string>('');
  const [countedQty, setCountedQty] = useState<string>('');
  const [countNotes, setCountNotes] = useState('');
  const [countHistory, setCountHistory] = useState<InventoryCount[]>([]);
  const [countLoading, setCountLoading] = useState(false);

  // Variance tab state
  const [varianceData, setVarianceData] = useState<VarianceReport[]>([]);
  const [varianceLoading, setVarianceLoading] = useState(false);

  // Alerts tab state
  const [alerts, setAlerts] = useState<ShrinkageAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Insights tab state
  const [insights, setInsights] = useState<InventoryInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [expandedRisk, setExpandedRisk] = useState<Record<string, boolean>>({ critical: true, high: true, medium: false, low: false });

  useEffect(() => {
    fetchItems();
    getInventoryForecast()
      .then(setForecasts)
      .catch(() => {});
  }, []);

  useEffect(() => {
    filterAndSortItems();
  }, [items, searchTerm, sortBy, selectedCategory]);

  useEffect(() => {
    if (activeTab === 'stock') {
      loadCOGS();
    } else if (activeTab === 'count') {
      loadCountHistory();
    } else if (activeTab === 'variance') {
      loadVarianceReport();
    } else if (activeTab === 'alerts') {
      loadAlerts();
    } else if (activeTab === 'waste') {
      loadWasteData();
    } else if (activeTab === 'scan') {
      checkCameraSupport();
      scanInputRef.current?.focus();
    } else if (activeTab === 'insights') {
      loadInsights();
    }
  }, [activeTab]);

  // Cleanup camera on unmount or tab change
  useEffect(() => {
    return () => { stopCamera(); };
  }, [activeTab]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInventory();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:fetchInventory'));
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortItems = () => {
    let filtered = items;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(term) ||
        item.sku?.toLowerCase().includes(term) ||
        item.barcode?.toLowerCase().includes(term)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'quantity') {
        return a.quantity - b.quantity;
      } else if (sortBy === 'status') {
        const aLow = a.quantity <= a.low_stock_threshold ? 0 : 1;
        const bLow = b.quantity <= b.low_stock_threshold ? 0 : 1;
        return bLow - aLow;
      }
      return 0;
    });

    setFilteredItems(filtered);
  };

  const handleRestock = async () => {
    if (!restockingId || !restockAmount) return;

    try {
      setActionLoading(true);
      const amount = parseFloat(restockAmount);
      if (isNaN(amount) || amount <= 0) {
        setError(t('inventory.invalidRestockAmount'));
        return;
      }

      await restockItem(restockingId, amount);
      await fetchItems();
      setRestockingId(null);
      setRestockAmount('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inventory.failedRestock'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditThreshold = async (id: number) => {
    if (!editThreshold) return;

    try {
      setActionLoading(true);
      const threshold = parseFloat(editThreshold);
      if (isNaN(threshold) || threshold < 0) {
        setError(t('inventory.invalidThreshold'));
        return;
      }

      await updateInventory(id, { low_stock_threshold: threshold });
      await fetchItems();
      setEditingId(null);
      setEditThreshold('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inventory.failedUpdateThreshold'));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (quantity: number, threshold: number) => {
    if (quantity === 0) return <span className="px-3 py-1 bg-brand-600/20 text-brand-400 rounded-full text-xs font-medium border border-brand-800">{t('inventory.status.outOfStock')}</span>;
    if (quantity <= threshold) return <span className="px-3 py-1 bg-amber-600/20 text-amber-400 rounded-full text-xs font-medium border border-amber-800">{t('inventory.status.lowStock')}</span>;
    return <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-xs font-medium border border-green-800">{t('inventory.status.inStock')}</span>;
  };

  const getExpiryBadge = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const now = new Date();
    const exp = new Date(expiryDate);
    const daysUntil = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) {
      return <span className="px-2 py-0.5 bg-red-900/30 text-red-400 rounded text-xs font-medium">{t('inventory.expired')}</span>;
    }
    if (daysUntil <= 7) {
      return <span className="px-2 py-0.5 bg-amber-900/30 text-amber-400 rounded text-xs font-medium">{t('inventory.expiresSoon')}</span>;
    }
    return null;
  };

  // COGS functions
  const loadCOGS = async () => {
    try {
      setCogsLoading(true);
      const data = await getCOGSSummary('30d');
      setCogsSummary(data);
    } catch {
      // Silently fail — widget is informational
    } finally {
      setCogsLoading(false);
    }
  };

  // Scan tab functions
  const checkCameraSupport = () => {
    setCameraSupported('BarcodeDetector' in window);
  };

  const handleScanLookup = async (value?: string) => {
    const input = value || scanInput.trim();
    if (!input) return;

    try {
      setScanLoading(true);
      setError(null);
      const item = await lookupInventoryItem(input);
      setScannedItem(item);
      setScanRestockQty('1');
      setScanCostPrice(item.cost_price ? String(item.cost_price) : '');
      setScanInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('scan.notFound'));
      setScannedItem(null);
    } finally {
      setScanLoading(false);
    }
  };

  const handleScanRestock = async () => {
    if (!scannedItem || !scanRestockQty) return;
    const qty = parseFloat(scanRestockQty);
    if (isNaN(qty) || qty <= 0) return;

    try {
      setActionLoading(true);
      setError(null);
      const barcode = scannedItem.barcode || scannedItem.sku || '';
      const cost = scanCostPrice ? parseFloat(scanCostPrice) : undefined;
      const result = await scanRestock({ barcode, quantity: qty, cost_price: cost });

      // Add to session
      setScanSession(prev => [{
        item: scannedItem,
        quantity: qty,
        scanned_at: new Date().toISOString(),
      }, ...prev]);

      setError(null);
      setScannedItem(null);
      setScanRestockQty('');
      setScanCostPrice('');
      // Refresh inventory in background
      fetchItems();
      scanInputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('scan.failedRestock'));
    } finally {
      setActionLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        detectBarcode();
      }
    } catch {
      setError(t('scan.cameraNotSupported'));
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const detectBarcode = async () => {
    if (!('BarcodeDetector' in window) || !videoRef.current) return;
    const BarcodeDetectorAPI = (window as any).BarcodeDetector;
    const detector = new BarcodeDetectorAPI({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] });

    const scan = async () => {
      if (!videoRef.current || !cameraActive) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          stopCamera();
          setScanInput(code);
          handleScanLookup(code);
          return;
        }
      } catch { /* ignore detection errors */ }
      if (cameraActive) requestAnimationFrame(scan);
    };
    requestAnimationFrame(scan);
  };

  // Waste tab functions
  const loadWasteData = async () => {
    try {
      setWasteReportLoading(true);
      const [entries, report] = await Promise.all([
        getWasteLog(),
        getWasteReport(),
      ]);
      setWasteEntries(entries);
      setWasteReport(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('waste.failedLoadReport'));
    } finally {
      setWasteReportLoading(false);
    }
  };

  const handleLogWaste = async () => {
    if (!wasteItemId || !wasteQty || !wasteReason) return;
    const qty = parseFloat(wasteQty);
    if (isNaN(qty) || qty <= 0) return;

    try {
      setWasteLoading(true);
      setError(null);
      await logWaste({
        inventory_item_id: parseInt(wasteItemId),
        quantity: qty,
        reason: wasteReason,
        notes: wasteNotes || undefined,
      });
      setWasteItemId('');
      setWasteQty('');
      setWasteReason('spoilage');
      setWasteNotes('');
      await Promise.all([loadWasteData(), fetchItems()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('waste.failedLog'));
    } finally {
      setWasteLoading(false);
    }
  };

  // Count tab functions
  const loadCountHistory = async () => {
    try {
      setCountLoading(true);
      const data = await getInventoryCounts();
      setCountHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inventory.failedLoadCounts'));
    } finally {
      setCountLoading(false);
    }
  };

  const handleRecordCount = async () => {
    if (!countItemId || !countedQty) return;

    try {
      setActionLoading(true);
      setError(null);
      await recordInventoryCount(parseInt(countItemId), { counted_quantity: parseFloat(countedQty), notes: countNotes || undefined });
      setCountItemId('');
      setCountedQty('');
      setCountNotes('');
      await loadCountHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:recordCount'));
    } finally {
      setActionLoading(false);
    }
  };

  // Variance tab functions
  const loadVarianceReport = async () => {
    try {
      setVarianceLoading(true);
      const data = await getVarianceReport();
      setVarianceData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:loadVariance'));
    } finally {
      setVarianceLoading(false);
    }
  };

  // Alerts tab functions
  const loadAlerts = async () => {
    try {
      setAlertsLoading(true);
      const data = await getShrinkageAlerts();
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:loadAlerts'));
    } finally {
      setAlertsLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: number) => {
    try {
      setActionLoading(true);
      await acknowledgeShrinkageAlert(alertId);
      await loadAlerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:acknowledgeAlert'));
    } finally {
      setActionLoading(false);
    }
  };

  // Insights tab functions
  const loadInsights = async () => {
    try {
      setInsightsLoading(true);
      const data = await getInventoryInsights();
      setInsights(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('insights.failedLoad'));
    } finally {
      setInsightsLoading(false);
    }
  };

  // Velocity chart data pivot
  const velocityChartData = useMemo(() => {
    if (!insights?.velocityChart?.length) return [];
    // Collect all dates
    const dateSet = new Set<string>();
    for (const item of insights.velocityChart) {
      for (const d of item.daily) dateSet.add(d.date);
    }
    const dates = Array.from(dateSet).sort();
    return dates.map(date => {
      const row: Record<string, unknown> = { date: date.slice(5) }; // MM-DD
      for (const item of insights.velocityChart) {
        const dayData = item.daily.find(d => d.date === date);
        row[item.name] = dayData?.quantity_used || 0;
      }
      return row;
    });
  }, [insights?.velocityChart]);

  const VELOCITY_COLORS = [
    '#0d9488', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6',
    '#ec4899', '#10b981', '#f97316', '#06b6d4', '#84cc16',
  ];

  const categories = ['all', ...Array.from(new Set(items.map((item) => item.category)))];

  const wasteReasons = ['spoilage', 'prep_error', 'dropped', 'expired', 'other'] as const;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'stock', label: t('inventory.tabs.stock'), icon: <ClipboardList size={18} /> },
    { key: 'scan', label: t('inventory.tabs.scan'), icon: <ScanLine size={18} /> },
    { key: 'waste', label: t('inventory.tabs.waste'), icon: <Trash2 size={18} /> },
    { key: 'count', label: t('inventory.tabs.count'), icon: <Check size={18} /> },
    { key: 'variance', label: t('inventory.tabs.variance'), icon: <BarChart3 size={18} /> },
    { key: 'alerts', label: t('inventory.tabs.alerts'), icon: <AlertTriangle size={18} /> },
    { key: 'insights', label: t('inventory.tabs.insights'), icon: <Sparkles size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-3xl font-black tracking-tighter">{t('inventory.title')}</h1>
            {limits.inventoryItems !== Infinity && (
              <span className="text-sm text-neutral-400 ml-3">
                {items.length} / {limits.inventoryItems} items
              </span>
            )}
          </div>
          <BrandLogo className="h-10" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="bg-brand-900/30 border border-brand-800 rounded-lg p-4 mb-6 flex justify-between items-center">
            <p className="text-brand-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-brand-400 hover:text-brand-300"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-neutral-800 pb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ========== STOCK TAB ========== */}
        {activeTab === 'stock' && (
          <>
            {/* COGS Widget */}
            {cogsSummary && cogsSummary.revenue > 0 && (
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="text-brand-500" size={20} />
                  <h3 className="font-semibold text-white">{t('cogs.title')}</h3>
                  <span className="text-xs text-neutral-500 ml-auto">30 days</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-neutral-800 rounded-lg">
                    <p className="text-neutral-400 text-xs">{t('cogs.revenue')}</p>
                    <p className="text-lg font-bold text-white">${cogsSummary.revenue.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-neutral-800 rounded-lg">
                    <p className="text-neutral-400 text-xs">{t('cogs.foodCostPercent')}</p>
                    <p className={`text-lg font-bold ${cogsSummary.food_cost_percent > 35 ? 'text-red-400' : cogsSummary.food_cost_percent > 30 ? 'text-amber-400' : 'text-green-400'}`}>
                      {cogsSummary.food_cost_percent.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-neutral-800 rounded-lg">
                    <p className="text-neutral-400 text-xs">{t('cogs.wasteCost')}</p>
                    <p className="text-lg font-bold text-red-400">${cogsSummary.waste_cost.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-neutral-800 rounded-lg">
                    <p className="text-neutral-400 text-xs">{t('cogs.grossMargin')}</p>
                    <p className="text-lg font-bold text-green-400">{cogsSummary.gross_margin_percent.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-neutral-500" size={20} />
                  <input
                    type="text"
                    placeholder={t('inventory.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-brand-600"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-brand-600"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? t('inventory.allCategories') : cat}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortField)}
                  className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-brand-600"
                >
                  <option value="name">{t('inventory.sortByName')}</option>
                  <option value="quantity">{t('inventory.sortByQuantity')}</option>
                  <option value="status">{t('inventory.sortByStatus')}</option>
                </select>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-20 bg-neutral-800 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="mx-auto text-neutral-600 mb-3" size={40} />
                  <p className="text-neutral-400">{t('inventory.noItemsFound')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-800 border-b border-neutral-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('inventory.columns.itemName')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('inventory.columns.currentStock')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('inventory.columns.threshold')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('inventory.columns.status')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('inventory.columns.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                          <td className="px-6 py-4">
                            <div>
                              <span className="font-medium text-white">{item.name}</span>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {item.sku && (
                                  <span className="text-xs text-neutral-500">{t('inventory.sku')}: {item.sku}</span>
                                )}
                                {item.barcode && (
                                  <span className="text-xs text-neutral-500">{t('inventory.barcode')}: {item.barcode}</span>
                                )}
                                {item.cost_price != null && item.cost_price > 0 && (
                                  <span className="text-xs text-neutral-500">${Number(item.cost_price).toFixed(2)}</span>
                                )}
                                {getExpiryBadge(item.expiry_date)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-neutral-300">
                              {item.quantity} {item.unit}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {editingId === item.id ? (
                              <div className="flex gap-2 items-center">
                                <input
                                  type="number"
                                  value={editThreshold}
                                  onChange={(e) => setEditThreshold(e.target.value)}
                                  className="w-20 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-brand-600"
                                  placeholder={item.low_stock_threshold.toString()}
                                />
                                <button
                                  onClick={() => handleEditThreshold(item.id)}
                                  disabled={actionLoading}
                                  className="p-1 text-green-400 hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <Check size={18} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditThreshold('');
                                  }}
                                  className="p-1 text-neutral-400 hover:bg-neutral-700 rounded-lg transition-colors"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2 items-center">
                                <span className="text-neutral-300">{item.low_stock_threshold}</span>
                                <button
                                  onClick={() => {
                                    setEditingId(item.id);
                                    setEditThreshold(item.low_stock_threshold.toString());
                                  }}
                                  className="p-1 text-neutral-500 hover:bg-neutral-700 rounded-lg transition-colors"
                                >
                                  <Edit2 size={16} />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(item.quantity, item.low_stock_threshold)}
                          </td>
                          <td className="px-6 py-4">
                            {restockingId === item.id ? (
                              <div className="flex gap-2 items-center">
                                <button
                                  onClick={() => setRestockAmount(Math.max(0, parseFloat(restockAmount) - 1).toString())}
                                  className="p-1 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors text-white"
                                >
                                  <Minus size={18} />
                                </button>
                                <input
                                  type="number"
                                  value={restockAmount}
                                  onChange={(e) => setRestockAmount(e.target.value)}
                                  className="w-16 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-center focus:outline-none focus:border-brand-600"
                                  placeholder="0"
                                />
                                <button
                                  onClick={() => setRestockAmount(((parseFloat(restockAmount) || 0) + 1).toString())}
                                  className="p-1 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors text-white"
                                >
                                  <Plus size={18} />
                                </button>
                                <button
                                  onClick={() => handleRestock()}
                                  disabled={actionLoading || !restockAmount}
                                  className="px-3 py-1 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                                >
                                  <Check size={18} />
                                </button>
                                <button
                                  onClick={() => {
                                    setRestockingId(null);
                                    setRestockAmount('');
                                  }}
                                  className="px-3 py-1 bg-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-600 transition-colors"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setRestockingId(item.id);
                                  setRestockAmount('');
                                }}
                                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium min-h-[44px] flex items-center justify-center"
                              >
                                {t('inventory.restock')}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* AI Forecast Section */}
            {forecasts.filter(f => f.risk_level === 'critical' || f.risk_level === 'high').length > 0 && (
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-brand-500" size={20} />
                    <h3 className="font-semibold text-white">{t('inventory.aiPredictions')}</h3>
                  </div>
                  <button
                    onClick={() => setShowForecasts(!showForecasts)}
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    {showForecasts ? t('inventory.hide') : t('inventory.showAll')}
                  </button>
                </div>
                <div className="space-y-2">
                  {forecasts
                    .filter(f => showForecasts || f.risk_level === 'critical' || f.risk_level === 'high')
                    .slice(0, showForecasts ? undefined : 5)
                    .map((f) => (
                      <div key={f.inventory_item_id} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{f.name}</p>
                          <p className="text-neutral-500 text-xs">
                            {f.avg_daily_usage > 0
                              ? t('inventory.daysLeft', { days: f.days_until_stockout, usage: f.avg_daily_usage, unit: f.unit })
                              : t('inventory.insufficientData')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            f.risk_level === 'critical' ? 'bg-brand-900/30 text-brand-400' :
                            f.risk_level === 'high' ? 'bg-orange-900/30 text-orange-400' :
                            f.risk_level === 'medium' ? 'bg-amber-900/30 text-amber-400' :
                            'bg-green-900/30 text-green-400'
                          }`}>
                            {f.risk_level.toUpperCase()}
                          </span>
                          {f.suggested_reorder_qty && (
                            <span className="text-xs text-neutral-500">
                              {t('inventory.reorder', { qty: f.suggested_reorder_qty, unit: f.unit })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {!loading && filteredItems.length > 0 && (
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <h3 className="font-semibold text-white mb-4">{t('inventory.summary.title')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-neutral-800 rounded-lg">
                    <p className="text-neutral-400 text-sm">{t('inventory.summary.totalItems')}</p>
                    <p className="text-2xl font-bold text-white">{filteredItems.length}</p>
                  </div>
                  <div className="p-4 bg-neutral-800 rounded-lg">
                    <p className="text-neutral-400 text-sm">{t('inventory.summary.lowStock')}</p>
                    <p className="text-2xl font-bold text-amber-400">
                      {filteredItems.filter((i) => i.quantity <= i.low_stock_threshold && i.quantity > 0).length}
                    </p>
                  </div>
                  <div className="p-4 bg-neutral-800 rounded-lg">
                    <p className="text-neutral-400 text-sm">{t('inventory.summary.outOfStock')}</p>
                    <p className="text-2xl font-bold text-brand-500">
                      {filteredItems.filter((i) => i.quantity === 0).length}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========== SCAN TAB ========== */}
        {activeTab === 'scan' && (
          <>
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">{t('scan.title')}</h3>

              {/* Scan input */}
              <div className="flex gap-3 mb-6">
                <div className="relative flex-1">
                  <ScanLine className="absolute left-3 top-3 text-neutral-500" size={20} />
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScanLookup()}
                    placeholder={t('scan.inputPlaceholder')}
                    className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-brand-600"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => handleScanLookup()}
                  disabled={scanLoading || !scanInput.trim()}
                  className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {scanLoading ? t('scan.scanning') : t('scan.lookup')}
                </button>
                {cameraSupported && (
                  <button
                    onClick={cameraActive ? stopCamera : startCamera}
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      cameraActive
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                    }`}
                  >
                    {cameraActive ? <CameraOff size={20} /> : <Camera size={20} />}
                  </button>
                )}
              </div>

              {/* Camera view */}
              {cameraActive && (
                <div className="mb-6 rounded-lg overflow-hidden border border-neutral-700">
                  <video ref={videoRef} className="w-full max-h-64 object-cover bg-black" />
                </div>
              )}

              {/* Scanned item detail */}
              {scannedItem && (
                <div className="p-4 bg-neutral-800 rounded-lg border border-brand-700 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="text-brand-400" size={20} />
                    <h4 className="text-white font-semibold">{t('scan.itemFound')}</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-neutral-400 text-xs">{t('inventory.columns.itemName')}</p>
                      <p className="text-white font-medium">{scannedItem.name}</p>
                    </div>
                    <div>
                      <p className="text-neutral-400 text-xs">{t('scan.currentStock')}</p>
                      <p className="text-white">{scannedItem.quantity} {scannedItem.unit}</p>
                    </div>
                    {scannedItem.barcode && (
                      <div>
                        <p className="text-neutral-400 text-xs">{t('inventory.barcode')}</p>
                        <p className="text-neutral-300 text-sm">{scannedItem.barcode}</p>
                      </div>
                    )}
                    {scannedItem.sku && (
                      <div>
                        <p className="text-neutral-400 text-xs">{t('inventory.sku')}</p>
                        <p className="text-neutral-300 text-sm">{scannedItem.sku}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 items-end">
                    <div>
                      <label className="text-neutral-400 text-xs block mb-1">{t('scan.restockQty')}</label>
                      <input
                        type="number"
                        value={scanRestockQty}
                        onChange={(e) => setScanRestockQty(e.target.value)}
                        className="w-24 px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-brand-600"
                        min="0.1"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 text-xs block mb-1">{t('scan.costPrice')}</label>
                      <input
                        type="number"
                        value={scanCostPrice}
                        onChange={(e) => setScanCostPrice(e.target.value)}
                        className="w-28 px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-brand-600"
                        min="0"
                        step="0.01"
                        placeholder="$0.00"
                      />
                    </div>
                    <button
                      onClick={handleScanRestock}
                      disabled={actionLoading || !scanRestockQty}
                      className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 font-medium"
                    >
                      {actionLoading ? t('scan.restocking') : t('scan.confirmRestock')}
                    </button>
                    <button
                      onClick={() => { setScannedItem(null); scanInputRef.current?.focus(); }}
                      className="px-4 py-2 bg-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-600 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Scan session */}
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{t('scan.session')}</h3>
                {scanSession.length > 0 && (
                  <button
                    onClick={() => setScanSession([])}
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    {t('scan.clearSession')}
                  </button>
                )}
              </div>
              {scanSession.length === 0 ? (
                <div className="text-center py-12">
                  <ScanLine className="mx-auto text-neutral-600 mb-3" size={40} />
                  <p className="text-neutral-400">{t('scan.sessionEmpty')}</p>
                  <p className="text-neutral-500 text-sm mt-1">{t('scan.sessionHint')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scanSession.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{entry.item.name}</p>
                        <p className="text-neutral-500 text-xs">
                          {entry.item.barcode || entry.item.sku || ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-brand-400 font-medium">+{entry.quantity} {entry.item.unit}</span>
                        <span className="text-neutral-500 text-xs">
                          {formatDateTime(new Date(entry.scanned_at))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ========== WASTE TAB ========== */}
        {activeTab === 'waste' && (
          <>
            {/* Log waste form */}
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">{t('waste.logWaste')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <select
                  value={wasteItemId}
                  onChange={(e) => setWasteItemId(e.target.value)}
                  className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-brand-600"
                >
                  <option value="">{t('waste.selectItem')}</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.quantity} {item.unit})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={wasteQty}
                  onChange={(e) => setWasteQty(e.target.value)}
                  placeholder={t('waste.quantity')}
                  className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-brand-600"
                  min="0.1"
                  step="0.1"
                />
                <select
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-brand-600"
                >
                  {wasteReasons.map((r) => (
                    <option key={r} value={r}>{t(`waste.reasons.${r}`)}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={wasteNotes}
                  onChange={(e) => setWasteNotes(e.target.value)}
                  placeholder={t('waste.notes')}
                  className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-brand-600"
                />
                <button
                  onClick={handleLogWaste}
                  disabled={wasteLoading || !wasteItemId || !wasteQty}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {wasteLoading ? t('waste.submitting') : t('waste.submit')}
                </button>
              </div>
            </div>

            {/* Waste report summary */}
            {wasteReportLoading ? (
              <div className="space-y-3 mb-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-neutral-800 rounded animate-pulse"></div>
                ))}
              </div>
            ) : wasteReport && wasteReport.summary.total_entries > 0 ? (
              <>
                <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 mb-6">
                  <h3 className="text-lg font-bold text-white mb-4">{t('waste.report.title')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-neutral-800 rounded-lg">
                      <p className="text-neutral-400 text-sm">{t('waste.report.totalCost')}</p>
                      <p className="text-2xl font-bold text-red-400">
                        ${wasteReport.summary.total_waste_cost.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 bg-neutral-800 rounded-lg">
                      <p className="text-neutral-400 text-sm">{t('waste.report.totalEntries')}</p>
                      <p className="text-2xl font-bold text-white">{wasteReport.summary.total_entries}</p>
                    </div>
                    <div className="p-4 bg-neutral-800 rounded-lg">
                      <p className="text-neutral-400 text-sm">{t('waste.report.byReason')}</p>
                      <div className="mt-2 space-y-1">
                        {Object.entries(wasteReport.summary.by_reason).map(([reason, data]) => (
                          <div key={reason} className="flex justify-between text-sm">
                            <span className="text-neutral-300">{t(`waste.reasons.${reason}`)}</span>
                            <span className="text-red-400">${data.cost.toLocaleString()} ({data.count})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Top wasted items */}
                  {wasteReport.by_item.length > 0 && (
                    <div>
                      <h4 className="text-white font-semibold mb-3">{t('waste.report.topItems')}</h4>
                      <div className="space-y-2">
                        {wasteReport.by_item.slice(0, 10).map((item) => (
                          <div key={item.inventory_item_id} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                            <div>
                              <p className="text-white font-medium">{item.name}</p>
                              <p className="text-neutral-500 text-xs">
                                {item.total_quantity} {item.unit} | {item.entry_count} entries | Top: {t(`waste.reasons.${item.top_reason}`)}
                              </p>
                            </div>
                            <span className="text-red-400 font-medium">${item.total_cost.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 mb-6">
                <div className="text-center py-12">
                  <Trash2 className="mx-auto text-neutral-600 mb-3" size={40} />
                  <p className="text-neutral-400">{t('waste.report.noData')}</p>
                </div>
              </div>
            )}

            {/* Recent waste entries */}
            {wasteEntries.length > 0 && (
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <h3 className="text-lg font-bold text-white mb-4">{t('waste.title')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-800 border-b border-neutral-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.item')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('waste.quantity')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('waste.reason')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('inventory.costPrice')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.notes')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.date')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wasteEntries.slice(0, 50).map((entry) => (
                        <tr key={entry.id} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                          <td className="px-6 py-4 font-medium text-white">{entry.item_name}</td>
                          <td className="px-6 py-4 text-red-400">{entry.quantity} {entry.unit}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-red-900/20 text-red-400 rounded text-xs font-medium">
                              {t(`waste.reasons.${entry.reason}`)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-red-400">${Number(entry.cost_at_time).toFixed(2)}</td>
                          <td className="px-6 py-4 text-neutral-500 text-sm">{entry.notes || '-'}</td>
                          <td className="px-6 py-4 text-neutral-500 text-sm">
                            {formatDateTime(new Date(entry.created_at))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========== COUNT TAB ========== */}
        {activeTab === 'count' && (
          <>
            {/* Record a Count */}
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">{t('count.title')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select
                  value={countItemId}
                  onChange={(e) => setCountItemId(e.target.value)}
                  className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-brand-600"
                >
                  <option value="">{t('count.selectItem')}</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({t('count.inSystem', { qty: item.quantity, unit: item.unit })})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={countedQty}
                  onChange={(e) => setCountedQty(e.target.value)}
                  placeholder={t('count.countedQuantity')}
                  className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-brand-600"
                />
                <input
                  type="text"
                  value={countNotes}
                  onChange={(e) => setCountNotes(e.target.value)}
                  placeholder={t('count.notes')}
                  className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-brand-600"
                />
                <button
                  onClick={handleRecordCount}
                  disabled={actionLoading || !countItemId || !countedQty}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {t('count.recordCount')}
                </button>
              </div>
            </div>

            {/* Count History */}
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <h3 className="text-lg font-bold text-white mb-4">{t('count.history')}</h3>
              {countLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-neutral-800 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : countHistory.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="mx-auto text-neutral-600 mb-3" size={40} />
                  <p className="text-neutral-400">{t('count.noCountsYet')}</p>
                  <p className="text-neutral-500 text-sm mt-1">{t('count.useFormAbove')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-800 border-b border-neutral-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.item')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.counted')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.system')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.variance')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.variancePercent')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.notes')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.date')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {countHistory.map((count) => {
                        const isHigh = Math.abs(count.variance_percent) > 10;
                        return (
                          <tr key={count.id} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                            <td className="px-6 py-4 font-medium text-white">{count.item_name}</td>
                            <td className="px-6 py-4 text-neutral-300">{count.counted_quantity}</td>
                            <td className="px-6 py-4 text-neutral-300">{count.system_quantity}</td>
                            <td className="px-6 py-4">
                              <span className={count.variance !== 0 ? (count.variance < 0 ? 'text-brand-400' : 'text-amber-400') : 'text-green-400'}>
                                {count.variance > 0 ? '+' : ''}{count.variance}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                isHigh ? 'bg-brand-900/30 text-brand-400' : 'bg-neutral-800 text-neutral-400'
                              }`}>
                                {count.variance_percent > 0 ? '+' : ''}{count.variance_percent.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-neutral-500 text-sm">{count.notes || '-'}</td>
                            <td className="px-6 py-4 text-neutral-500 text-sm">
                              {formatDate(new Date(count.created_at))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ========== VARIANCE TAB ========== */}
        {activeTab === 'variance' && (
          <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{t('variance.title')}</h3>
              <button
                onClick={loadVarianceReport}
                className="text-sm text-neutral-400 hover:text-white transition-colors"
              >
                {t('common:buttons.refresh')}
              </button>
            </div>
            {varianceLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-neutral-800 rounded animate-pulse"></div>
                ))}
              </div>
            ) : varianceData.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="mx-auto text-neutral-600 mb-3" size={40} />
                <p className="text-neutral-400">{t('variance.noData')}</p>
                <p className="text-neutral-500 text-sm mt-1">{t('variance.recordCountsHint')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-800 border-b border-neutral-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.item')}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('variance.countSessions')}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('variance.avgVariance')}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('variance.avgVariancePercent')}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('variance.totalVariance')}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('variance.risk')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {varianceData.map((row) => {
                      const avgPct = Math.abs(row.avg_variance_percent);
                      const risk = avgPct > 15 ? 'high' : avgPct > 5 ? 'medium' : 'low';
                      return (
                        <tr key={row.inventory_item_id} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                          <td className="px-6 py-4 font-medium text-white">{row.name}</td>
                          <td className="px-6 py-4 text-neutral-300">{row.count_sessions}</td>
                          <td className="px-6 py-4">
                            <span className={row.avg_variance < 0 ? 'text-brand-400' : row.avg_variance > 0 ? 'text-amber-400' : 'text-green-400'}>
                              {row.avg_variance > 0 ? '+' : ''}{row.avg_variance.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={avgPct > 10 ? 'text-brand-400' : 'text-neutral-300'}>
                              {row.avg_variance_percent > 0 ? '+' : ''}{row.avg_variance_percent.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-neutral-300">
                            {row.total_variance.toFixed(1)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                              risk === 'high' ? 'bg-brand-900/30 text-brand-400' :
                              risk === 'medium' ? 'bg-amber-900/30 text-amber-400' :
                              'bg-green-900/30 text-green-400'
                            }`}>
                              {risk}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========== ALERTS TAB ========== */}
        {activeTab === 'alerts' && (
          <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-brand-500" size={20} />
                <h3 className="text-lg font-bold text-white">{t('alerts.title')}</h3>
              </div>
              <button
                onClick={loadAlerts}
                className="text-sm text-neutral-400 hover:text-white transition-colors"
              >
                {t('common:buttons.refresh')}
              </button>
            </div>
            {alertsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-neutral-800 rounded animate-pulse"></div>
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto text-green-600 mb-3" size={40} />
                <p className="text-neutral-400">{t('alerts.noAlerts')}</p>
                <p className="text-neutral-500 text-sm mt-1">{t('alerts.withinRanges')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      alert.severity === 'critical'
                        ? 'bg-brand-900/20 border-brand-800'
                        : alert.severity === 'high'
                        ? 'bg-orange-900/20 border-orange-800'
                        : 'bg-amber-900/20 border-amber-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            alert.severity === 'critical' ? 'bg-brand-900/30 text-brand-400' :
                            alert.severity === 'high' ? 'bg-orange-900/30 text-orange-400' :
                            'bg-amber-900/30 text-amber-400'
                          }`}>
                            {alert.severity}
                          </span>
                          <span className="text-xs text-neutral-500 uppercase">{alert.alert_type}</span>
                        </div>
                        <p className="text-white font-medium">{alert.item_name}</p>
                        <p className="text-neutral-400 text-sm mt-1">{alert.message}</p>
                        {alert.variance_amount !== undefined && (
                          <p className="text-neutral-500 text-xs mt-1">
                            {t('inventory.varianceUnits', { amount: alert.variance_amount })}
                          </p>
                        )}
                        <p className="text-neutral-600 text-xs mt-1">
                          {formatDateTime(new Date(alert.created_at))}
                        </p>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={actionLoading}
                          className="px-3 py-2 bg-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-600 transition-colors text-sm font-medium disabled:opacity-50 ml-4"
                        >
                          {t('alerts.acknowledge')}
                        </button>
                      )}
                      {alert.acknowledged && (
                        <span className="px-3 py-2 text-green-400 text-xs font-medium ml-4">
                          {t('alerts.acknowledged')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========== AI INSIGHTS TAB ========== */}
        {activeTab === 'insights' && (
          <>
            {/* Plan gating */}
            {limits.ai.mode === 'locked' ? (
              <div className="bg-neutral-900 p-12 rounded-lg border border-neutral-800 text-center">
                <Lock className="mx-auto text-neutral-600 mb-4" size={48} />
                <h3 className="text-xl font-bold text-white mb-2">{t('insights.upgradeTitle')}</h3>
                <p className="text-neutral-400 max-w-md mx-auto">{t('insights.upgradeMessage')}</p>
              </div>
            ) : insightsLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-28 bg-neutral-800 rounded-lg animate-pulse"></div>
                  ))}
                </div>
                <div className="h-72 bg-neutral-800 rounded-lg animate-pulse"></div>
                <div className="h-48 bg-neutral-800 rounded-lg animate-pulse"></div>
              </div>
            ) : !insights ? (
              <div className="bg-neutral-900 p-12 rounded-lg border border-neutral-800 text-center">
                <Brain className="mx-auto text-neutral-600 mb-4" size={48} />
                <p className="text-neutral-400">{t('insights.empty')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* (a) KPI Dashboard Header */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Items at Risk */}
                  <div className="bg-neutral-900 p-5 rounded-lg border border-neutral-800">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="text-red-400" size={18} />
                      <p className="text-neutral-400 text-sm">{t('insights.kpis.itemsAtRisk')}</p>
                    </div>
                    <p className="text-3xl font-bold text-red-400">{insights.kpis.itemsAtRisk}</p>
                    <p className="text-neutral-500 text-xs mt-1">
                      {t('insights.kpis.criticalAndHigh', { critical: insights.kpis.criticalCount, high: insights.kpis.highCount })}
                    </p>
                  </div>

                  {/* Prep Actions Needed */}
                  <div className="bg-neutral-900 p-5 rounded-lg border border-neutral-800">
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardList className="text-amber-400" size={18} />
                      <p className="text-neutral-400 text-sm">{t('insights.kpis.prepActions')}</p>
                    </div>
                    <p className="text-3xl font-bold text-amber-400">{insights.kpis.prepActionsNeeded}</p>
                    <p className="text-neutral-500 text-xs mt-1">{t('insights.kpis.actionsNeeded')}</p>
                  </div>

                  {/* Waste Trend */}
                  <div className="bg-neutral-900 p-5 rounded-lg border border-neutral-800">
                    <div className="flex items-center gap-2 mb-2">
                      {insights.kpis.wasteTrendPercent <= 0
                        ? <TrendingDown className="text-green-400" size={18} />
                        : <TrendingUp className="text-red-400" size={18} />
                      }
                      <p className="text-neutral-400 text-sm">{t('insights.kpis.wasteTrend')}</p>
                    </div>
                    <p className={`text-3xl font-bold ${insights.kpis.wasteTrendPercent <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {insights.kpis.wasteTrendPercent > 0 ? '+' : ''}{insights.kpis.wasteTrendPercent}%
                    </p>
                    <p className="text-neutral-500 text-xs mt-1">{t('insights.kpis.vsLastPeriod')}</p>
                  </div>

                  {/* AI Acceptance Rate */}
                  <div className="bg-neutral-900 p-5 rounded-lg border border-neutral-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="text-brand-400" size={18} />
                      <p className="text-neutral-400 text-sm">{t('insights.kpis.acceptanceRate')}</p>
                    </div>
                    <p className="text-3xl font-bold text-brand-400">{insights.kpis.acceptanceRate}%</p>
                    <p className="text-neutral-500 text-xs mt-1">{t('insights.kpis.ofSuggestions')}</p>
                  </div>
                </div>

                {/* (b) Consumption Velocity Chart */}
                <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="text-brand-500" size={20} />
                    <h3 className="font-semibold text-white">{t('insights.velocity.title')}</h3>
                  </div>
                  <p className="text-neutral-500 text-xs mb-4">{t('insights.velocity.subtitle')}</p>
                  {velocityChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={velocityChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" stroke="#666" tick={{ fill: '#999', fontSize: 12 }} />
                        <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                          labelStyle={{ color: '#ccc' }}
                          itemStyle={{ color: '#ccc' }}
                        />
                        <Legend wrapperStyle={{ color: '#999', fontSize: 12 }} />
                        {insights.velocityChart.map((item, idx) => (
                          <Line
                            key={item.inventory_item_id}
                            type="monotone"
                            dataKey={item.name}
                            stroke={VELOCITY_COLORS[idx % VELOCITY_COLORS.length]}
                            strokeWidth={2}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12">
                      <BarChart3 className="mx-auto text-neutral-600 mb-3" size={40} />
                      <p className="text-neutral-400">{t('insights.velocity.noData')}</p>
                    </div>
                  )}
                </div>

                {/* (c) Smart Reorder Recommendations */}
                <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="text-brand-500" size={20} />
                    <h3 className="font-semibold text-white">{t('insights.reorder.title')}</h3>
                  </div>
                  {insights.forecasts.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="mx-auto text-green-600 mb-3" size={40} />
                      <p className="text-neutral-400">{t('insights.reorder.noData')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(['critical', 'high', 'medium', 'low'] as const).map((level) => {
                        const levelItems = insights.forecasts.filter(f => f.risk_level === level);
                        if (levelItems.length === 0) return null;
                        const isExpanded = expandedRisk[level];
                        return (
                          <div key={level}>
                            <button
                              onClick={() => setExpandedRisk(prev => ({ ...prev, [level]: !prev[level] }))}
                              className="flex items-center gap-2 w-full text-left py-2"
                            >
                              {isExpanded ? <ChevronDown size={16} className="text-neutral-400" /> : <ChevronRight size={16} className="text-neutral-400" />}
                              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                level === 'critical' ? 'bg-red-900/30 text-red-400' :
                                level === 'high' ? 'bg-orange-900/30 text-orange-400' :
                                level === 'medium' ? 'bg-amber-900/30 text-amber-400' :
                                'bg-green-900/30 text-green-400'
                              }`}>
                                {level}
                              </span>
                              <span className="text-neutral-500 text-sm">{t('insights.reorder.items', { count: levelItems.length })}</span>
                            </button>
                            {isExpanded && (
                              <div className="space-y-2 ml-6">
                                {levelItems.map((f) => (
                                  <div key={f.inventory_item_id} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                                    <div>
                                      <p className="text-white font-medium">{f.name}</p>
                                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                        <span className="text-neutral-500 text-xs">
                                          {t('insights.reorder.currentStock', { qty: f.current_quantity, unit: f.unit })}
                                        </span>
                                        {f.avg_daily_usage > 0 && (
                                          <span className="text-neutral-500 text-xs">
                                            {t('insights.reorder.avgDaily', { usage: f.avg_daily_usage.toFixed(1), unit: f.unit })}
                                          </span>
                                        )}
                                        {f.days_until_stockout != null && (
                                          <span className="text-neutral-500 text-xs">
                                            {t('insights.reorder.daysUntilStockout', { days: f.days_until_stockout })}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {f.suggested_reorder_qty && (
                                      <span className="text-brand-400 text-sm font-medium whitespace-nowrap ml-4">
                                        {t('insights.reorder.suggestedReorder', { qty: f.suggested_reorder_qty, unit: f.unit })}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* (d) Prep Forecast */}
                {insights.prepForecast && (
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <ClipboardList className="text-brand-500" size={20} />
                          <h3 className="font-semibold text-white">{t('insights.prep.title')}</h3>
                        </div>
                        <p className="text-neutral-500 text-xs">
                          {t('insights.prep.subtitle')} {insights.prepForecast.target_date} ({insights.prepForecast.day_of_week})
                          {' — '}{t('insights.prep.estOrders', { count: insights.prepForecast.estimated_orders })}
                        </p>
                      </div>
                    </div>
                    {(() => {
                      const actionItems = insights.prepForecast.items?.filter(i => i.prep_action !== 'sufficient') || [];
                      if (actionItems.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <CheckCircle className="mx-auto text-green-600 mb-3" size={32} />
                            <p className="text-neutral-400">{t('insights.prep.noActions')}</p>
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-2">
                          {actionItems.map((item) => (
                            <div key={item.inventory_item_id} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-white font-medium">{item.item_name}</p>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    item.prep_action === 'restock_needed' ? 'bg-red-900/30 text-red-400' : 'bg-amber-900/30 text-amber-400'
                                  }`}>
                                    {item.prep_action === 'restock_needed' ? t('insights.prep.restockNeeded') : t('insights.prep.prepExtra')}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                  <span className="text-neutral-500 text-xs">
                                    {t('insights.prep.deficit', { qty: Math.abs(item.deficit).toFixed(1), unit: item.unit })}
                                  </span>
                                  {item.menu_items_using?.length > 0 && (
                                    <span className="text-neutral-500 text-xs">
                                      {t('insights.prep.usedBy', { items: item.menu_items_using.map(m => m.menu_item_name).join(', ') })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* (e) Waste Intelligence */}
                <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Trash2 className="text-red-400" size={20} />
                    <h3 className="font-semibold text-white">{t('insights.waste.title')}</h3>
                  </div>
                  <p className="text-neutral-500 text-xs mb-4">{t('insights.waste.chartTitle')}</p>
                  {insights.wasteDailyTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={insights.wasteDailyTrend.map(d => ({ ...d, date: d.date.slice(5) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" stroke="#666" tick={{ fill: '#999', fontSize: 12 }} />
                        <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                          labelStyle={{ color: '#ccc' }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
                        />
                        <Bar dataKey="total_cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 mb-4">
                      <Trash2 className="mx-auto text-neutral-600 mb-3" size={32} />
                      <p className="text-neutral-400">{t('insights.waste.noChartData')}</p>
                    </div>
                  )}

                  {/* Waste alerts */}
                  {insights.wasteAlerts.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-white font-semibold mb-3">{t('insights.waste.alertsTitle')}</h4>
                      <div className="space-y-2">
                        {insights.wasteAlerts.map((alert, idx) => (
                          <div key={idx} className="p-3 bg-neutral-800 rounded-lg border border-red-900/30">
                            <p className="text-white font-medium">{alert.item_name || alert.message || 'Waste Alert'}</p>
                            <div className="flex flex-wrap gap-x-4 mt-1">
                              {alert.waste_rate != null && (
                                <span className="text-red-400 text-xs">{t('insights.waste.wasteRate', { rate: (alert.waste_rate * 100).toFixed(1) })}</span>
                              )}
                              {alert.top_reason && (
                                <span className="text-neutral-500 text-xs">{t('insights.waste.topReason', { reason: alert.top_reason })}</span>
                              )}
                              {alert.total_waste_cost != null && (
                                <span className="text-red-400 text-xs">{t('insights.waste.cost', { cost: alert.total_waste_cost.toFixed(2) })}</span>
                              )}
                            </div>
                            {alert.message && alert.item_name && (
                              <p className="text-neutral-500 text-xs mt-1">{alert.message}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {insights.wasteAlerts.length === 0 && insights.wasteDailyTrend.length > 0 && (
                    <p className="text-neutral-500 text-sm mt-4">{t('insights.waste.noAlerts')}</p>
                  )}
                </div>

                {/* (f) Push/Avoid Items */}
                {(insights.pushItems.length > 0 || insights.avoidItems.length > 0) && (
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="text-brand-500" size={20} />
                      <h3 className="font-semibold text-white">{t('insights.push.title')}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Push column */}
                      <div>
                        <h4 className="text-green-400 font-semibold text-sm mb-3">{t('insights.push.pushTitle')}</h4>
                        {insights.pushItems.length > 0 ? (
                          <div className="space-y-2">
                            {insights.pushItems.map((item) => (
                              <div key={item.menu_item_id} className="p-3 bg-green-900/10 border border-green-900/30 rounded-lg">
                                <p className="text-white font-medium">{item.name}</p>
                                <div className="flex flex-wrap gap-x-4 mt-1">
                                  <span className="text-green-400 text-xs">{t('insights.push.reason', { reason: item.reason })}</span>
                                  {item.ingredient_name && (
                                    <span className="text-neutral-500 text-xs">{t('insights.push.ingredient', { name: item.ingredient_name })}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-neutral-500 text-sm">{t('insights.push.noPush')}</p>
                        )}
                      </div>
                      {/* Avoid column */}
                      <div>
                        <h4 className="text-red-400 font-semibold text-sm mb-3">{t('insights.push.avoidTitle')}</h4>
                        {insights.avoidItems.length > 0 ? (
                          <div className="space-y-2">
                            {insights.avoidItems.map((item) => (
                              <div key={item.menu_item_id} className="p-3 bg-red-900/10 border border-red-900/30 rounded-lg">
                                <p className="text-white font-medium">{item.name}</p>
                                <div className="flex flex-wrap gap-x-4 mt-1">
                                  <span className="text-red-400 text-xs">{t('insights.push.reason', { reason: item.reason })}</span>
                                  {item.ingredient_name && (
                                    <span className="text-neutral-500 text-xs">{t('insights.push.ingredient', { name: item.ingredient_name })}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-neutral-500 text-sm">{t('insights.push.noAvoid')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
