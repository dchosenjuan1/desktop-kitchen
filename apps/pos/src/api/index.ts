import {
  Employee,
  MenuCategory,
  MenuItem,
  Order,
  OrderItem,
  VirtualBrand,
  InventoryItem,
  PaymentIntent,
  PaymentStatus,
  SalesReport,
  TopItemsReport,
  EmployeePerformanceReport,
  HourlyReport,
  CashCardBreakdown,
  COGSReport,
  CategoryMargins,
  ContributionMarginReport,
  LiveDashboardData,
  ModifierGroup,
  ComboDefinition,
  OrderPayment,
  Printer,
  DeliveryPlatform,
  DeliveryOrder,
  AISuggestion,
  InventoryPushData,
  AISuggestionFeedback,
  AIConfig,
  AIInsights,
  AIAnalytics,
  PricingSuggestion,
  InventoryForecast,
  CategoryRole,
  PricingDashboard,
  PricingRule,
  PriceHistoryEntry,
  PricingGuardrails,
  PricingExperiment,
  GrokPricingSuggestion,
  Refund,
  CryptoPayment,
  CryptoEstimate,
  ReconciliationRow,
  PaymentFeeSummary,
  RefundSummary,
  InventoryCount,
  ShrinkageAlert,
  VarianceReport,
  Vendor,
  PurchaseOrder,
  PrepForecast,
  InventoryInsights,
  FinancialProjection,
  LoyaltyCustomer,
  StampCard,
  StampResult,
  LoyaltyAnalytics,
  LoyaltyConfig,
  ReferralEvent,
  PaginatedResponse,
  OrderTemplate,
  WasteLogEntry,
  WasteReport,
  COGSSummary,
  CfdiConfig,
  CfdiInvoice,
  CfdiInvoiceToken,
  CfdiCatalogs,
  RecipeIngredient,
  RecipeSummaryItem,
  StressTestTemplate,
  StressTestConfig,
  StressTestProgress,
  StressTestResults,
  StressTestResidual,
} from '../types';

// Employee ID for display/sync use - set after login
let currentEmployeeId: number | null = null;

export function setCurrentEmployeeId(id: number | null) {
  currentEmployeeId = id;
}

// Employee JWT for auth header - set after login
let currentEmployeeToken: string | null = null;

export function setCurrentEmployeeToken(token: string | null) {
  currentEmployeeToken = token;
}

export function getCurrentEmployeeToken(): string | null {
  return currentEmployeeToken;
}

// Capacitor native: API calls must go to the remote server (local dist/ has no backend)
const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();

function getCapacitorApiBase(): string {
  const tenantSlug = localStorage.getItem('tenant_id');
  if (tenantSlug) {
    return `https://${tenantSlug}.desktop.kitchen/api`;
  }
  return 'https://pos.desktop.kitchen/api';
}

const API_BASE_URL = import.meta.env.VITE_API_URL || (isCapacitor ? getCapacitorApiBase() : '/api');

// For iOS: try multiple LAN IPs when the primary fails
const IOS_FALLBACK_URLS = (import.meta.env.VITE_API_URL_FALLBACKS || '')
  .split(',')
  .filter(Boolean);

let activeBaseUrl = API_BASE_URL;
let fallbackResolved = false;

async function resolveBaseUrl(): Promise<string> {
  if (fallbackResolved || !IOS_FALLBACK_URLS.length) return activeBaseUrl;

  // Try the primary URL first
  try {
    await fetch(`${activeBaseUrl}/menu/categories`, { signal: AbortSignal.timeout(2000) });
    fallbackResolved = true;
    return activeBaseUrl;
  } catch {
    // Primary failed, try fallbacks
  }

  for (const url of IOS_FALLBACK_URLS) {
    try {
      await fetch(`${url}/menu/categories`, { signal: AbortSignal.timeout(2000) });
      activeBaseUrl = url;
      fallbackResolved = true;
      console.log(`[API] Using fallback server: ${url}`);
      return activeBaseUrl;
    } catch {
      // Try next
    }
  }

  // All failed, stick with primary (will show errors naturally)
  fallbackResolved = true;
  return activeBaseUrl;
}

/* ==================== Numeric Coercion ==================== */

// Neon Postgres returns NUMERIC(10,2) columns as strings to preserve precision.
// This causes NaN bugs when JS uses + (string concat) instead of addition.
// Coerce known numeric fields to numbers at the API boundary so all downstream
// code can safely do arithmetic without per-callsite Number() wrapping.
const NUMERIC_FIELDS = new Set([
  'price', 'unit_price', 'subtotal', 'tax', 'tip', 'total',
  'cost_price', 'price_adjustment', 'combo_price', 'amount',
  'delivery_fee', 'platform_commission', 'custom_price', 'price_amount',
  'unit_cost', 'total_amount', 'line_total', 'total_spent', 'refund_total',
  'quantity_used', 'quantity_received',
]);

function coerceNumerics(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) return data.map(coerceNumerics);
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key in obj) {
      if (NUMERIC_FIELDS.has(key) && typeof obj[key] === 'string') {
        const n = Number(obj[key]);
        if (!Number.isNaN(n)) obj[key] = n;
      } else if (typeof obj[key] === 'object') {
        obj[key] = coerceNumerics(obj[key]);
      }
    }
    return obj;
  }
  return data;
}

/* ==================== Base API Client ==================== */

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const base = IOS_FALLBACK_URLS.length ? await resolveBaseUrl() : activeBaseUrl;
  const url = `${base}${endpoint}`;
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (currentEmployeeToken) {
    defaultHeaders['Authorization'] = `Bearer ${currentEmployeeToken}`;
  }
  const tenantId = localStorage.getItem('tenant_id');
  if (tenantId) {
    defaultHeaders['X-Tenant-ID'] = tenantId;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // Use default error message if response is not JSON
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return coerceNumerics(data) as T;
}

/* ==================== Menu Endpoints ==================== */

export async function getCategories(activeOnly?: boolean): Promise<MenuCategory[]> {
  const endpoint = activeOnly ? '/menu/categories?active_only=1' : '/menu/categories';
  return apiRequest<MenuCategory[]>(endpoint);
}

export async function createCategory(data: { name: string; sort_order?: number }): Promise<MenuCategory> {
  return apiRequest<MenuCategory>('/menu/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCategory(id: number, data: { name?: string; sort_order?: number }): Promise<any> {
  return apiRequest(`/menu/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function toggleCategory(id: number): Promise<any> {
  return apiRequest(`/menu/categories/${id}/toggle`, { method: 'PUT' });
}

export async function getMenuItems(categoryId?: string, includeInactive?: boolean): Promise<MenuItem[]> {
  const params = new URLSearchParams();
  if (categoryId) params.set('category_id', categoryId);
  if (includeInactive) params.set('include_inactive', '1');
  const qs = params.toString();
  const endpoint = qs ? `/menu/items?${qs}` : '/menu/items';
  return apiRequest<MenuItem[]>(endpoint);
}

export async function createMenuItem(data: {
  category_id: number;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
}): Promise<MenuItem> {
  return apiRequest<MenuItem>('/menu/items', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMenuItem(id: number, data: {
  category_id?: number;
  name?: string;
  price?: number;
  description?: string;
  image_url?: string;
}): Promise<any> {
  return apiRequest(`/menu/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function toggleMenuItem(id: number): Promise<any> {
  return apiRequest(`/menu/items/${id}/toggle`, { method: 'PUT' });
}

export async function getPopularItems(limit: number = 8): Promise<MenuItem[]> {
  return apiRequest<MenuItem[]>(`/menu/items/popular?limit=${limit}`);
}

export async function getCategorySuggestedOrder(hour?: number): Promise<number[]> {
  const h = hour ?? new Date().getHours();
  return apiRequest<number[]>(`/menu/categories/suggested-order?hour=${h}`);
}

export async function getPosBrands(): Promise<VirtualBrand[]> {
  return apiRequest<VirtualBrand[]>('/menu/pos-brands');
}

/* ==================== Order Endpoints ==================== */

interface OrderFilters {
  status?: string;
  date?: string;
  payment_status?: string;
}

export async function getOrders(filters?: OrderFilters): Promise<Order[]> {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.date) queryParams.append('date', filters.date);
  if (filters?.payment_status) queryParams.append('payment_status', filters.payment_status);

  const endpoint = `/orders${queryParams.toString() ? `?${queryParams}` : ''}`;
  return apiRequest<Order[]>(endpoint);
}

export async function getOrder(id: number): Promise<Order> {
  return apiRequest<Order>(`/orders/${id}`);
}

interface CreateOrderData {
  employee_id: number;
  items: {
    menu_item_id: number;
    quantity: number;
    notes?: string;
    modifiers?: number[];
    combo_instance_id?: string | null;
    virtual_brand_id?: number | null;
  }[];
}

export async function createOrder(data: CreateOrderData): Promise<Order> {
  return apiRequest<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateOrderStatus(
  id: number,
  status: string
): Promise<any> {
  return apiRequest(`/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function getKitchenOrders(): Promise<Order[]> {
  return apiRequest<Order[]>('/orders/kitchen/active');
}

export async function confirmOrderPayment(
  orderId: number,
  payment_method: 'cash' | 'card' | 'transfer',
  reference?: string
): Promise<{ success: boolean; order: Order }> {
  return apiRequest(`/orders/${orderId}/payment`, {
    method: 'PATCH',
    body: JSON.stringify({ payment_method, reference }),
  });
}

/* ==================== Payment Endpoints ==================== */

interface CreatePaymentIntentData {
  order_id: number;
  tip?: number;
}

export async function createPaymentIntent(
  data: CreatePaymentIntentData
): Promise<any> {
  return apiRequest('/payments/create-intent', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

interface ConfirmPaymentData {
  order_id: number;
  payment_intent_id: string;
}

export async function confirmPayment(data: ConfirmPaymentData): Promise<any> {
  return apiRequest('/payments/confirm', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

interface RefundPaymentData {
  order_id: number;
  amount?: number;
  items?: Array<{ order_item_id: number; quantity: number }>;
  reason?: string;
}

export async function refundPayment(data: RefundPaymentData): Promise<any> {
  return apiRequest('/payments/refund', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getOrderRefunds(orderId: number): Promise<Refund[]> {
  return apiRequest<Refund[]>(`/payments/refunds/${orderId}`);
}

export async function getAllRefunds(startDate?: string, endDate?: string): Promise<Refund[]> {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  const qs = params.toString();
  return apiRequest<Refund[]>(`/payments/refunds${qs ? `?${qs}` : ''}`);
}

export async function cashPayment(data: {
  order_id: number;
  tip?: number;
  amount_received?: number;
}): Promise<any> {
  return apiRequest('/payments/cash', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getPaymentStatus(orderId: number): Promise<any> {
  return apiRequest(`/payments/${orderId}`);
}

/* ==================== Crypto Payment Endpoints ==================== */

export async function getCryptoEstimate(amount: number, currency: string): Promise<CryptoEstimate> {
  return apiRequest<CryptoEstimate>(`/payments/crypto/estimate?amount=${amount}&currency=${currency}`);
}

export async function getCryptoMinAmount(currency: string): Promise<{ min_amount: number }> {
  return apiRequest(`/payments/crypto/min-amount?currency=${currency}`);
}

export async function createCryptoPayment(data: {
  order_id: number;
  pay_currency: string;
  tip?: number;
}): Promise<CryptoPayment> {
  return apiRequest<CryptoPayment>('/payments/crypto/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getCryptoPaymentStatus(paymentId: string): Promise<CryptoPayment> {
  return apiRequest<CryptoPayment>(`/payments/crypto/status/${paymentId}`);
}

/* ==================== Inventory Endpoints ==================== */

export async function getInventory(): Promise<InventoryItem[]> {
  return apiRequest<InventoryItem[]>('/inventory');
}

export async function getLowStock(): Promise<InventoryItem[]> {
  return apiRequest<InventoryItem[]>('/inventory/low-stock');
}

export async function updateInventory(
  id: number,
  data: { quantity?: number; low_stock_threshold?: number }
): Promise<any> {
  return apiRequest(`/inventory/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function restockItem(id: number, quantity: number): Promise<any> {
  return apiRequest(`/inventory/${id}/restock`, {
    method: 'POST',
    body: JSON.stringify({ quantity }),
  });
}

export async function deductInventory(orderId: number): Promise<any> {
  return apiRequest('/inventory/deduct', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId }),
  });
}

export async function lookupInventoryItem(value: string): Promise<InventoryItem> {
  return apiRequest<InventoryItem>(`/inventory/lookup?barcode=${encodeURIComponent(value)}`);
}

export async function scanRestock(data: {
  barcode: string;
  quantity: number;
  cost_price?: number;
}): Promise<{ item: InventoryItem; new_quantity: number }> {
  return apiRequest('/inventory/scan-restock', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createInventoryItem(data: {
  name: string;
  unit: string;
  quantity?: number;
  low_stock_threshold?: number;
  cost_price?: number;
  sku?: string;
  barcode?: string;
  expiry_date?: string;
  lot_number?: string;
  category?: string;
}): Promise<InventoryItem> {
  return apiRequest<InventoryItem>('/inventory', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/* ==================== Waste Endpoints ==================== */

export async function logWaste(data: {
  inventory_item_id: number;
  quantity: number;
  reason: string;
  notes?: string;
}): Promise<WasteLogEntry> {
  return apiRequest<WasteLogEntry>('/waste', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getWasteLog(params?: {
  start_date?: string;
  end_date?: string;
  item_id?: number;
}): Promise<WasteLogEntry[]> {
  const qs = new URLSearchParams();
  if (params?.start_date) qs.append('start_date', params.start_date);
  if (params?.end_date) qs.append('end_date', params.end_date);
  if (params?.item_id) qs.append('item_id', String(params.item_id));
  const s = qs.toString();
  return apiRequest<WasteLogEntry[]>(`/waste${s ? `?${s}` : ''}`);
}

export async function getWasteReport(params?: {
  start_date?: string;
  end_date?: string;
}): Promise<WasteReport> {
  const qs = new URLSearchParams();
  if (params?.start_date) qs.append('start_date', params.start_date);
  if (params?.end_date) qs.append('end_date', params.end_date);
  const s = qs.toString();
  return apiRequest<WasteReport>(`/waste/report${s ? `?${s}` : ''}`);
}

/* ==================== COGS Summary ==================== */

export async function getCOGSSummary(period?: string): Promise<COGSSummary> {
  const p = period || '30d';
  return apiRequest<COGSSummary>(`/reports/cogs-summary?period=${p}`);
}

/* ==================== Employee Endpoints ==================== */

export async function getEmployees(): Promise<Employee[]> {
  return apiRequest<Employee[]>('/employees');
}

interface CreateEmployeeData {
  name: string;
  pin: string;
  role: string;
}

export async function createEmployee(data: CreateEmployeeData): Promise<Employee> {
  return apiRequest<Employee>('/employees', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateEmployee(
  id: number,
  data: { name?: string; pin?: string; role?: string }
): Promise<any> {
  return apiRequest(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function loginEmployee(pin: string): Promise<Employee> {
  return apiRequest<Employee>('/employees/login', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
}

export async function toggleEmployee(id: number): Promise<any> {
  return apiRequest(`/employees/${id}/toggle`, { method: 'PUT' });
}

/* ==================== Reports Endpoints ==================== */

export async function getSalesReport(period: string): Promise<SalesReport> {
  return apiRequest<SalesReport>(`/reports/sales?period=${period}`);
}

export async function getTopItems(
  period: string,
  limit: number = 10
): Promise<TopItemsReport[]> {
  return apiRequest<TopItemsReport[]>(
    `/reports/top-items?period=${period}&limit=${limit}`
  );
}

export async function getEmployeePerformance(
  period: string
): Promise<EmployeePerformanceReport[]> {
  return apiRequest<EmployeePerformanceReport[]>(
    `/reports/employee-performance?period=${period}`
  );
}

export async function getHourlyReport(): Promise<HourlyReport[]> {
  return apiRequest<HourlyReport[]>('/reports/hourly');
}

export async function getCashCardBreakdown(period: string): Promise<CashCardBreakdown> {
  return apiRequest<CashCardBreakdown>(`/reports/cash-card-breakdown?period=${period}`);
}

export async function getCOGSReport(period: string): Promise<COGSReport> {
  return apiRequest<COGSReport>(`/reports/cogs?period=${period}`);
}

export async function getCategoryMargins(period: string): Promise<CategoryMargins> {
  return apiRequest<CategoryMargins>(`/reports/category-margins?period=${period}`);
}

export async function getContributionMargin(period: string): Promise<ContributionMarginReport> {
  return apiRequest<ContributionMarginReport>(`/reports/contribution-margin?period=${period}`);
}

export async function getLiveDashboard(): Promise<LiveDashboardData> {
  return apiRequest<LiveDashboardData>('/reports/live');
}

export async function getDeliveryMargins(period: string): Promise<any> {
  return apiRequest(`/reports/delivery-margins?period=${period}`);
}

export async function getChannelComparison(period: string): Promise<any> {
  return apiRequest(`/reports/channel-comparison?period=${period}`);
}

/* ==================== Modifier Endpoints ==================== */

export async function getModifierGroups(): Promise<ModifierGroup[]> {
  return apiRequest<ModifierGroup[]>('/modifiers/groups');
}

export async function getModifierGroupsForItem(menuItemId: number): Promise<ModifierGroup[]> {
  return apiRequest<ModifierGroup[]>(`/modifiers/groups/item/${menuItemId}`);
}

export async function createModifierGroup(data: Partial<ModifierGroup>): Promise<ModifierGroup> {
  return apiRequest<ModifierGroup>('/modifiers/groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateModifierGroup(id: number, data: Partial<ModifierGroup>): Promise<any> {
  return apiRequest(`/modifiers/groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function createModifier(data: { group_id: number; name: string; price_adjustment: number }): Promise<any> {
  return apiRequest('/modifiers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateModifier(id: number, data: Partial<{ name: string; price_adjustment: number; active: boolean }>): Promise<any> {
  return apiRequest(`/modifiers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function assignModifierGroupToItem(menuItemId: number, groupId: number): Promise<any> {
  return apiRequest('/modifiers/assign', {
    method: 'POST',
    body: JSON.stringify({ menu_item_id: menuItemId, modifier_group_id: groupId }),
  });
}

export async function removeModifierGroupFromItem(menuItemId: number, groupId: number): Promise<any> {
  return apiRequest('/modifiers/unassign', {
    method: 'POST',
    body: JSON.stringify({ menu_item_id: menuItemId, modifier_group_id: groupId }),
  });
}

export async function getItemsWithModifiers(): Promise<{ itemIds: number[] }> {
  return apiRequest<{ itemIds: number[] }>('/modifiers/items-with-modifiers');
}

/* ==================== Recipe Endpoints ==================== */

export async function getRecipeSummary(): Promise<RecipeSummaryItem[]> {
  return apiRequest<RecipeSummaryItem[]>('/menu/recipes/summary');
}

export async function getItemRecipe(menuItemId: number): Promise<RecipeIngredient[]> {
  return apiRequest<RecipeIngredient[]>(`/menu/items/${menuItemId}/recipe`);
}

export async function updateItemRecipe(
  menuItemId: number,
  ingredients: { inventory_item_id: number; quantity_used: number }[]
): Promise<RecipeIngredient[]> {
  return apiRequest<RecipeIngredient[]>(`/menu/items/${menuItemId}/recipe`, {
    method: 'PUT',
    body: JSON.stringify({ ingredients }),
  });
}

/* ==================== Combo Endpoints ==================== */

export async function getCombos(): Promise<ComboDefinition[]> {
  return apiRequest<ComboDefinition[]>('/combos');
}

export async function createCombo(data: Partial<ComboDefinition>): Promise<ComboDefinition> {
  return apiRequest<ComboDefinition>('/combos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCombo(id: number, data: Partial<ComboDefinition>): Promise<any> {
  return apiRequest(`/combos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/* ==================== Split Payment Endpoints ==================== */

export async function splitPayment(data: {
  order_id: number;
  split_type: 'even' | 'by_item' | 'by_amount';
  splits: Array<{ payment_method: 'card' | 'cash'; amount: number; tip?: number; item_ids?: number[] }>;
}): Promise<any> {
  return apiRequest('/payments/split', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getOrderSplits(orderId: number): Promise<OrderPayment[]> {
  return apiRequest<OrderPayment[]>(`/payments/split/${orderId}`);
}

/* ==================== Printer Endpoints ==================== */

export async function getPrinters(): Promise<Printer[]> {
  return apiRequest<Printer[]>('/printers');
}

export async function createPrinter(data: Partial<Printer>): Promise<Printer> {
  return apiRequest<Printer>('/printers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePrinter(id: number, data: Partial<Printer>): Promise<any> {
  return apiRequest(`/printers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getCategoryPrinterRoutes(): Promise<any[]> {
  return apiRequest<any[]>('/printers/routes');
}

export async function updateCategoryPrinterRoute(categoryId: number, printerId: number | null): Promise<any> {
  return apiRequest('/printers/routes', {
    method: 'PUT',
    body: JSON.stringify({ category_id: categoryId, printer_id: printerId }),
  });
}

/* ==================== Delivery Endpoints ==================== */

export async function getDeliveryPlatforms(): Promise<DeliveryPlatform[]> {
  return apiRequest<DeliveryPlatform[]>('/delivery/platforms');
}

export async function updateDeliveryPlatform(id: number, data: Partial<DeliveryPlatform>): Promise<any> {
  return apiRequest(`/delivery/platforms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getDeliveryOrders(status?: string): Promise<DeliveryOrder[]> {
  const endpoint = status ? `/delivery/orders?status=${status}` : '/delivery/orders';
  return apiRequest<DeliveryOrder[]>(endpoint);
}

export async function updateDeliveryOrderStatus(id: number, status: string): Promise<any> {
  return apiRequest(`/delivery/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

/* ==================== AI Endpoints ==================== */

export async function getCartSuggestions(
  itemIds: number[],
  hour?: number
): Promise<AISuggestion[]> {
  const params = new URLSearchParams();
  params.append('items', itemIds.join(','));
  if (hour !== undefined) params.append('hour', String(hour));
  return apiRequest<AISuggestion[]>(`/ai/suggestions/cart?${params}`);
}

export async function getInventoryPushItems(): Promise<InventoryPushData> {
  return apiRequest<InventoryPushData>('/ai/suggestions/inventory-push');
}

export async function submitSuggestionFeedback(
  feedback: AISuggestionFeedback
): Promise<any> {
  return apiRequest('/ai/suggestions/feedback', {
    method: 'POST',
    body: JSON.stringify(feedback),
  });
}

export async function getAIConfig(): Promise<AIConfig> {
  return apiRequest<AIConfig>('/ai/config');
}

export async function updateAIConfig(
  data: { key: string; value: string; description?: string } | { entries: Array<{ key: string; value: string; description?: string }> }
): Promise<any> {
  return apiRequest('/ai/config', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getAIInsights(): Promise<AIInsights> {
  return apiRequest<AIInsights>('/ai/insights');
}

export async function getAIAnalytics(period?: string): Promise<AIAnalytics> {
  const endpoint = period ? `/ai/analytics?period=${period}` : '/ai/analytics';
  return apiRequest<AIAnalytics>(endpoint);
}

export async function getPricingSuggestions(): Promise<PricingSuggestion[]> {
  return apiRequest<PricingSuggestion[]>('/ai/pricing-suggestions');
}

export async function applyPricingSuggestion(
  id: string,
  menuItemId: number,
  newPrice: number
): Promise<any> {
  return apiRequest(`/ai/pricing-suggestions/${id}/apply`, {
    method: 'POST',
    body: JSON.stringify({ menu_item_id: menuItemId, new_price: newPrice }),
  });
}

export async function getInventoryForecast(): Promise<InventoryForecast[]> {
  return apiRequest<InventoryForecast[]>('/ai/inventory-forecast');
}

export async function getCategoryRoles(): Promise<CategoryRole[]> {
  return apiRequest<CategoryRole[]>('/ai/category-roles');
}

export async function updateCategoryRole(
  categoryId: number,
  role: string
): Promise<any> {
  return apiRequest(`/ai/category-roles/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export async function exportAIConfig(): Promise<any> {
  return apiRequest('/ai/config/export');
}

export async function importAIConfig(data: any): Promise<any> {
  return apiRequest('/ai/config/import', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function runGrokAnalysis(type?: string): Promise<any> {
  return apiRequest('/ai/analyze', {
    method: 'POST',
    body: JSON.stringify({ type: type || 'all' }),
  });
}

/* ==================== Dynamic Pricing Endpoints ==================== */

export async function getPricingDashboard(): Promise<PricingDashboard> {
  return apiRequest<PricingDashboard>('/pricing/dashboard');
}

export async function getEnhancedPricingSuggestions(): Promise<{ heuristic: GrokPricingSuggestion[]; grok: GrokPricingSuggestion[] }> {
  return apiRequest('/pricing/suggestions');
}

export async function triggerPricingAnalysis(): Promise<{ suggestions: GrokPricingSuggestion[]; cached: boolean }> {
  return apiRequest('/pricing/analyze', { method: 'POST' });
}

export async function applyEnhancedPricingSuggestion(id: string, menuItemId: number, newPrice: number): Promise<any> {
  return apiRequest(`/pricing/suggestions/${id}/apply`, {
    method: 'POST',
    body: JSON.stringify({ menu_item_id: menuItemId, new_price: newPrice }),
  });
}

export async function dismissPricingSuggestion(id: string): Promise<any> {
  return apiRequest(`/pricing/suggestions/${id}/dismiss`, { method: 'POST' });
}

export async function getPricingRules(): Promise<PricingRule[]> {
  return apiRequest<PricingRule[]>('/pricing/rules');
}

export async function createPricingRule(data: Partial<PricingRule>): Promise<{ success: boolean; id: number }> {
  return apiRequest('/pricing/rules', { method: 'POST', body: JSON.stringify(data) });
}

export async function updatePricingRule(id: number, data: Partial<PricingRule>): Promise<any> {
  return apiRequest(`/pricing/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deletePricingRule(id: number): Promise<any> {
  return apiRequest(`/pricing/rules/${id}`, { method: 'DELETE' });
}

export async function previewPricingRule(id: number): Promise<Array<{ menu_item_id: number; item_name: string; current_price: number; projected_price: number; change_percent: number }>> {
  return apiRequest(`/pricing/rules/${id}/preview`, { method: 'POST' });
}

export async function getPricingGuardrails(): Promise<PricingGuardrails> {
  return apiRequest<PricingGuardrails>('/pricing/guardrails');
}

export async function updatePricingGuardrails(data: Partial<PricingGuardrails>): Promise<any> {
  return apiRequest('/pricing/guardrails', { method: 'PUT', body: JSON.stringify(data) });
}

export async function getPriceHistory(params?: { item_id?: number; source?: string; from?: string; to?: string; page?: number; limit?: number }): Promise<{ data: PriceHistoryEntry[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  if (params?.item_id) qs.append('item_id', String(params.item_id));
  if (params?.source) qs.append('source', params.source);
  if (params?.from) qs.append('from', params.from);
  if (params?.to) qs.append('to', params.to);
  if (params?.page) qs.append('page', String(params.page));
  if (params?.limit) qs.append('limit', String(params.limit));
  const s = qs.toString();
  return apiRequest(`/pricing/history${s ? `?${s}` : ''}`);
}

export async function revertPriceChange(historyId: number): Promise<any> {
  return apiRequest(`/pricing/history/${historyId}/revert`, { method: 'POST' });
}

export async function getPricingImpact(itemId?: number): Promise<any[]> {
  const endpoint = itemId ? `/pricing/impact?item_id=${itemId}` : '/pricing/impact';
  return apiRequest(endpoint);
}

export async function getPricingExperiments(): Promise<PricingExperiment[]> {
  return apiRequest<PricingExperiment[]>('/pricing/experiments');
}

export async function createPricingExperiment(data: Partial<PricingExperiment>): Promise<{ success: boolean; id: number }> {
  return apiRequest('/pricing/experiments', { method: 'POST', body: JSON.stringify(data) });
}

export async function updatePricingExperiment(id: number, data: Partial<PricingExperiment> & { status?: string }): Promise<any> {
  return apiRequest(`/pricing/experiments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function applyExperimentWinner(id: number): Promise<any> {
  return apiRequest(`/pricing/experiments/${id}/apply-winner`, { method: 'POST' });
}

/* ==================== Reports - Reconciliation, Fees, Refunds ==================== */

export async function getReconciliation(startDate: string, endDate: string): Promise<{ rows: ReconciliationRow[]; summary: any }> {
  return apiRequest(`/reports/reconciliation?start_date=${startDate}&end_date=${endDate}`);
}

export async function getPaymentFees(period: string): Promise<PaymentFeeSummary> {
  return apiRequest<PaymentFeeSummary>(`/reports/payment-fees?period=${period}`);
}

export async function getRefundSummary(startDate?: string, endDate?: string): Promise<RefundSummary> {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  const qs = params.toString();
  return apiRequest<RefundSummary>(`/reports/refund-summary${qs ? `?${qs}` : ''}`);
}

/* ==================== Reports - Financial Projection ==================== */

export async function getFinancialProjection(month: string): Promise<FinancialProjection> {
  return apiRequest<FinancialProjection>(`/reports/financial-projection?month=${month}`);
}

export async function updateFinancialTargets(targets: Array<{ category: string; target_percent: number }>): Promise<any> {
  return apiRequest('/reports/financial-targets', {
    method: 'PUT',
    body: JSON.stringify({ targets }),
  });
}

export async function updateFinancialActual(data: { period: string; category: string; amount: number }): Promise<any> {
  return apiRequest('/reports/financial-actuals', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/* ==================== Inventory - Counts, Variance, Alerts ==================== */

export async function recordInventoryCount(id: number, data: { counted_quantity: number; notes?: string }): Promise<InventoryCount> {
  return apiRequest<InventoryCount>(`/inventory/${id}/count`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getInventoryCounts(params?: { item_id?: number; start_date?: string; end_date?: string }): Promise<InventoryCount[]> {
  const qs = new URLSearchParams();
  if (params?.item_id) qs.append('item_id', String(params.item_id));
  if (params?.start_date) qs.append('start_date', params.start_date);
  if (params?.end_date) qs.append('end_date', params.end_date);
  const s = qs.toString();
  return apiRequest<InventoryCount[]>(`/inventory/counts${s ? `?${s}` : ''}`);
}

export async function getVarianceReport(): Promise<VarianceReport[]> {
  return apiRequest<VarianceReport[]>('/inventory/variance-report');
}

export async function getShrinkageAlerts(acknowledged?: boolean): Promise<ShrinkageAlert[]> {
  const endpoint = acknowledged !== undefined
    ? `/inventory/shrinkage-alerts?acknowledged=${acknowledged ? '1' : '0'}`
    : '/inventory/shrinkage-alerts';
  return apiRequest<ShrinkageAlert[]>(endpoint);
}

export async function acknowledgeShrinkageAlert(id: number): Promise<any> {
  return apiRequest(`/inventory/shrinkage-alerts/${id}/acknowledge`, { method: 'PUT' });
}

/* ==================== Vendors ==================== */

export async function getVendors(): Promise<Vendor[]> {
  return apiRequest<Vendor[]>('/purchase-orders/vendors');
}

export async function createVendor(data: Partial<Vendor>): Promise<Vendor> {
  return apiRequest<Vendor>('/purchase-orders/vendors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateVendor(id: number, data: Partial<Vendor>): Promise<any> {
  return apiRequest(`/purchase-orders/vendors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/* ==================== Purchase Orders ==================== */

export async function getPurchaseOrders(status?: string): Promise<PurchaseOrder[]> {
  const endpoint = status ? `/purchase-orders?status=${status}` : '/purchase-orders';
  return apiRequest<PurchaseOrder[]>(endpoint);
}

export async function getPurchaseOrder(id: number): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>(`/purchase-orders/${id}`);
}

export async function createPurchaseOrder(data: {
  vendor_id: number;
  items?: Array<{ inventory_item_id: number; quantity_ordered: number; unit_cost: number }>;
  notes?: string;
}): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>('/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePurchaseOrder(id: number, data: {
  items?: Array<{ inventory_item_id: number; quantity_ordered: number; unit_cost: number }>;
  notes?: string;
}): Promise<any> {
  return apiRequest(`/purchase-orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function submitPurchaseOrder(id: number): Promise<any> {
  return apiRequest(`/purchase-orders/${id}/submit`, { method: 'POST' });
}

export async function receivePurchaseOrder(id: number, items: Array<{ po_item_id: number; quantity_received: number }>): Promise<any> {
  return apiRequest(`/purchase-orders/${id}/receive`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export async function cancelPurchaseOrder(id: number): Promise<any> {
  return apiRequest(`/purchase-orders/${id}/cancel`, { method: 'POST' });
}

/* ==================== Prep Forecast ==================== */

export async function getPrepForecast(date?: string): Promise<PrepForecast> {
  const endpoint = date ? `/ai/prep-forecast?date=${date}` : '/ai/prep-forecast';
  return apiRequest<PrepForecast>(endpoint);
}

export async function getInventoryInsights(): Promise<InventoryInsights> {
  return apiRequest<InventoryInsights>('/ai/inventory-insights');
}

/* ==================== Permissions ==================== */

export async function getAllPermissions(): Promise<Record<string, Record<string, boolean>>> {
  return apiRequest('/employees/permissions');
}

export async function updateRolePermissions(role: string, permissions: Record<string, boolean>): Promise<any> {
  return apiRequest(`/employees/permissions/${role}`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });
}

/* ==================== Loyalty / CRM Endpoints ==================== */

export async function lookupLoyaltyCustomer(phone: string): Promise<LoyaltyCustomer> {
  return apiRequest<LoyaltyCustomer>(`/loyalty/customers/phone/${encodeURIComponent(phone)}`);
}

export async function createLoyaltyCustomer(data: {
  phone: string;
  name: string;
  referral_code_used?: string;
  sms_opt_in?: boolean;
}): Promise<LoyaltyCustomer & { created: boolean }> {
  return apiRequest('/loyalty/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getLoyaltyCustomers(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<LoyaltyCustomer>> {
  const qs = new URLSearchParams();
  if (params?.search) qs.append('search', params.search);
  if (params?.page) qs.append('page', String(params.page));
  if (params?.limit) qs.append('limit', String(params.limit));
  const s = qs.toString();
  return apiRequest(`/loyalty/customers${s ? `?${s}` : ''}`);
}

export async function getLoyaltyCustomer(id: number): Promise<LoyaltyCustomer & { cards: any[]; recentEvents: any[] }> {
  return apiRequest(`/loyalty/customers/${id}`);
}

export async function updateLoyaltyCustomer(id: number, data: { name?: string; sms_opt_in?: boolean }): Promise<LoyaltyCustomer> {
  return apiRequest(`/loyalty/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function addStampsForOrder(customerId: number, orderId: number): Promise<StampResult> {
  return apiRequest<StampResult>(`/loyalty/customers/${customerId}/stamps`, {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId }),
  });
}

export async function addManualStamps(customerId: number, count: number): Promise<{ stampCard: any; customer: LoyaltyCustomer }> {
  return apiRequest(`/loyalty/customers/${customerId}/stamps/manual`, {
    method: 'POST',
    body: JSON.stringify({ count }),
  });
}

export async function redeemLoyaltyReward(customerId: number): Promise<any> {
  return apiRequest(`/loyalty/customers/${customerId}/redeem`, { method: 'POST' });
}

export async function getLoyaltyAnalytics(): Promise<LoyaltyAnalytics> {
  return apiRequest<LoyaltyAnalytics>('/loyalty/analytics');
}

export async function getLoyaltyReferrals(): Promise<{
  leaderboard: any[];
  recentReferrals: ReferralEvent[];
  totalReferrals: number;
}> {
  return apiRequest('/loyalty/referrals');
}

export async function getLoyaltyConfig(): Promise<LoyaltyConfig> {
  return apiRequest<LoyaltyConfig>('/loyalty/config');
}

export async function updateLoyaltyConfig(key: string, value: string): Promise<LoyaltyConfig> {
  return apiRequest<LoyaltyConfig>('/loyalty/config', {
    method: 'PUT',
    body: JSON.stringify({ key, value }),
  });
}

/* ==================== Order Template Endpoints ==================== */

export async function getOrderTemplates(): Promise<OrderTemplate[]> {
  return apiRequest<OrderTemplate[]>('/order-templates');
}

export async function createOrderTemplate(data: {
  name: string;
  description?: string;
  items: Array<{ menu_item_id: number; quantity: number }>;
}): Promise<OrderTemplate> {
  return apiRequest<OrderTemplate>('/order-templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/* ==================== Delivery Intelligence Endpoints ==================== */

export async function getDeliveryAnalytics(start?: string, end?: string): Promise<any> {
  const qs = new URLSearchParams();
  if (start) qs.append('start', start);
  if (end) qs.append('end', end);
  const s = qs.toString();
  return apiRequest(`/delivery-intel/analytics${s ? `?${s}` : ''}`);
}

export async function getMarkupRules(): Promise<any[]> {
  return apiRequest('/delivery-intel/markup-rules');
}

export async function createMarkupRule(data: {
  platform_id: number;
  menu_item_id?: number;
  category_id?: number;
  markup_type?: string;
  markup_value: number;
}): Promise<{ id: number }> {
  return apiRequest('/delivery-intel/markup-rules', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMarkupRule(id: number, data: {
  markup_type?: string;
  markup_value?: number;
  active?: boolean;
}): Promise<any> {
  return apiRequest(`/delivery-intel/markup-rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteMarkupRule(id: number): Promise<any> {
  return apiRequest(`/delivery-intel/markup-rules/${id}`, { method: 'DELETE' });
}

export async function getMarkupPreview(platformId: number): Promise<any[]> {
  return apiRequest(`/delivery-intel/markup-preview/${platformId}`);
}

export async function getVirtualBrands(): Promise<any[]> {
  return apiRequest('/delivery-intel/virtual-brands');
}

export async function createVirtualBrand(data: {
  name: string;
  platform_id: number;
  description?: string;
  logo_url?: string;
  display_type?: string;
  primary_color?: string;
  secondary_color?: string;
  font_family?: string;
  dark_bg?: string;
  slug?: string;
  show_in_pos?: boolean;
}): Promise<{ id: number }> {
  return apiRequest('/delivery-intel/virtual-brands', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateVirtualBrand(id: number, data: any): Promise<any> {
  return apiRequest(`/delivery-intel/virtual-brands/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getVirtualBrandItems(brandId: number): Promise<any[]> {
  return apiRequest(`/delivery-intel/virtual-brands/${brandId}/items`);
}

export async function setVirtualBrandItems(brandId: number, items: Array<{
  menu_item_id: number;
  custom_name?: string;
  custom_price?: number;
  show_image?: boolean;
}>): Promise<any> {
  return apiRequest(`/delivery-intel/virtual-brands/${brandId}/items`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export async function removeVirtualBrandItem(brandId: number, menuItemId: number): Promise<any> {
  return apiRequest(`/delivery-intel/virtual-brands/${brandId}/items/${menuItemId}`, { method: 'DELETE' });
}

export async function deleteVirtualBrand(brandId: number): Promise<any> {
  return apiRequest(`/delivery-intel/virtual-brands/${brandId}`, { method: 'DELETE' });
}

export async function getRecaptureCandidates(days?: number): Promise<any[]> {
  const qs = days ? `?days=${days}` : '';
  return apiRequest(`/delivery-intel/recapture/candidates${qs}`);
}

export async function sendRecaptureSMS(data: {
  phone: string;
  customer_name: string;
  platform: string;
  delivery_order_id?: number;
  message?: string;
}): Promise<any> {
  return apiRequest('/delivery-intel/recapture/send', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function markRecaptureConverted(id: number): Promise<any> {
  return apiRequest(`/delivery-intel/recapture/${id}/convert`, { method: 'POST' });
}

/* ==================== Menu Board Endpoints ==================== */

export async function getMenuBoardData(): Promise<any> {
  return apiRequest('/menu-board/data');
}

/* ==================== Billing Endpoints (Owner JWT Auth) ==================== */

function ownerHeaders(): Record<string, string> {
  const token = localStorage.getItem('owner_token');
  const tenantId = localStorage.getItem('tenant_id');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
  };
}

export async function getBillingStatus(): Promise<{
  plan: string;
  subscription_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}> {
  const base = IOS_FALLBACK_URLS.length ? await resolveBaseUrl() : activeBaseUrl;
  const res = await fetch(`${base}/billing`, { headers: ownerHeaders() });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to fetch billing status');
  return res.json();
}

export async function createCheckoutSession(plan: 'starter' | 'pro', promo_code?: string): Promise<{ url: string }> {
  const base = IOS_FALLBACK_URLS.length ? await resolveBaseUrl() : activeBaseUrl;
  const body: Record<string, string> = { plan };
  if (promo_code) body.promo_code = promo_code;
  const res = await fetch(`${base}/billing/checkout`, {
    method: 'POST',
    headers: ownerHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create checkout session');
  return res.json();
}

export async function validatePromoCode(code: string): Promise<{
  valid: boolean;
  code?: string;
  discount_description?: string;
  message?: string;
}> {
  const base = IOS_FALLBACK_URLS.length ? await resolveBaseUrl() : activeBaseUrl;
  const res = await fetch(`${base}/billing/promo/validate?code=${encodeURIComponent(code.trim().toUpperCase())}`);
  return res.json();
}

export async function createPortalSession(): Promise<{ url: string }> {
  const base = IOS_FALLBACK_URLS.length ? await resolveBaseUrl() : activeBaseUrl;
  const res = await fetch(`${base}/billing/portal`, {
    method: 'POST',
    headers: ownerHeaders(),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create portal session');
  return res.json();
}

/* ==================== Account Endpoints (Owner JWT Auth) ==================== */

export async function getAccount(): Promise<any> {
  const base = IOS_FALLBACK_URLS.length ? await resolveBaseUrl() : activeBaseUrl;
  const res = await fetch(`${base}/account`, { headers: ownerHeaders() });
  if (!res.ok) {
    const msg = (await res.json().catch(() => ({}))).error || 'Failed to fetch account';
    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function updateAccount(data: { name?: string; email?: string }): Promise<{ name: string; email: string }> {
  const base = IOS_FALLBACK_URLS.length ? await resolveBaseUrl() : activeBaseUrl;
  const res = await fetch(`${base}/account`, {
    method: 'PUT',
    headers: ownerHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to update account');
  return res.json();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const base = IOS_FALLBACK_URLS.length ? await resolveBaseUrl() : activeBaseUrl;
  const res = await fetch(`${base}/account/password`, {
    method: 'PUT',
    headers: ownerHeaders(),
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to change password');
}

/* ==================== CFDI / Electronic Invoicing Endpoints ==================== */

export async function getCfdiCatalogs(): Promise<CfdiCatalogs> {
  return apiRequest<CfdiCatalogs>('/cfdi/catalogs');
}

export async function getCfdiConfig(): Promise<{ config: CfdiConfig | null; facturapi_configured: boolean }> {
  return apiRequest('/cfdi/config');
}

export async function updateCfdiConfig(data: {
  rfc: string;
  legal_name: string;
  tax_regime: string;
  postal_code: string;
  default_uso_cfdi?: string;
  invoice_series?: string;
  invoice_link_expiry_hours?: number;
}): Promise<{ config: CfdiConfig }> {
  return apiRequest('/cfdi/config', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function uploadCSD(formData: FormData): Promise<{ config: CfdiConfig; message: string }> {
  const base = IOS_FALLBACK_URLS.length ? await resolveBaseUrl() : activeBaseUrl;
  const headers: Record<string, string> = {};
  if (currentEmployeeToken) {
    headers['Authorization'] = `Bearer ${currentEmployeeToken}`;
  }
  const tenantId = localStorage.getItem('tenant_id');
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }
  // Note: no Content-Type header — browser sets multipart boundary automatically
  const res = await fetch(`${base}/cfdi/config/csd`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upload CSD');
  }
  return res.json();
}

export async function testCfdiConnection(): Promise<{ success: boolean; expires_at?: string; error?: string }> {
  return apiRequest('/cfdi/config/test', { method: 'POST' });
}

export async function issueCfdiInvoice(data: {
  order_id: number;
  receptor?: { rfc: string; name: string; tax_regime: string; postal_code: string; uso_cfdi?: string };
  publico_general?: boolean;
}): Promise<CfdiInvoice> {
  return apiRequest<CfdiInvoice>('/cfdi/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getCfdiInvoices(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<{ invoices: CfdiInvoice[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.append('page', String(params.page));
  if (params?.limit) qs.append('limit', String(params.limit));
  if (params?.search) qs.append('search', params.search);
  if (params?.status) qs.append('status', params.status);
  const s = qs.toString();
  return apiRequest(`/cfdi/invoices${s ? `?${s}` : ''}`);
}

export async function getCfdiInvoice(id: number): Promise<CfdiInvoice> {
  return apiRequest<CfdiInvoice>(`/cfdi/invoices/${id}`);
}

export async function cancelCfdiInvoice(id: number, data: {
  motive: string;
  substitute_uuid?: string;
}): Promise<CfdiInvoice> {
  return apiRequest<CfdiInvoice>(`/cfdi/invoices/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getInvoiceToken(orderId: number): Promise<CfdiInvoiceToken> {
  return apiRequest<CfdiInvoiceToken>(`/cfdi/orders/${orderId}/token`);
}

/* ==================== Password Reset Endpoints (no auth) ==================== */

export async function ownerLogin(email: string, password: string): Promise<{ token: string; tenant: { id: string; subdomain: string; name: string } }> {
  const base = isCapacitor ? 'https://pos.desktop.kitchen/api' : (IOS_FALLBACK_URLS.length ? await resolveBaseUrl() : activeBaseUrl);
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const base = IOS_FALLBACK_URLS.length ? await resolveBaseUrl() : activeBaseUrl;
  const res = await fetch(`${base}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const base = IOS_FALLBACK_URLS.length ? await resolveBaseUrl() : activeBaseUrl;
  const res = await fetch(`${base}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Reset failed');
  }
  return res.json();
}

/* ==================== CFDI Public Endpoints (no auth) ==================== */

export async function getCfdiPublicOrder(token: string): Promise<{
  order_number: string;
  date: string;
  items: Array<{ item_name: string; quantity: number; unit_price: number }>;
  subtotal: number;
  tax: number;
  total: number;
  tenant_name: string;
  tenant_logo: string | null;
  tenant_color: string;
  emisor_postal_code: string;
}> {
  const base = IOS_FALLBACK_URLS.length ? await resolveBaseUrl() : activeBaseUrl;
  const res = await fetch(`${base}/cfdi-public/${token}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load order');
  }
  return res.json();
}

export async function issueCfdiPublicInvoice(token: string, data: {
  rfc: string;
  name: string;
  tax_regime: string;
  postal_code: string;
  uso_cfdi?: string;
}): Promise<{ uuid_fiscal: string; pdf_url: string; xml_url: string; invoice_id: number }> {
  const base = IOS_FALLBACK_URLS.length ? await resolveBaseUrl() : activeBaseUrl;
  const res = await fetch(`${base}/cfdi-public/${token}/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to issue invoice');
  }
  return res.json();
}

/* ==================== Mercado Pago Point Endpoints ==================== */

export async function getMpStatus(): Promise<{
  connected: boolean;
  mp_user_id: string | null;
  mp_default_terminal_id: string | null;
}> {
  return apiRequest('/payments/mp/status');
}

export async function getMpTerminals(): Promise<{ terminals: Array<{ id: string; external_pos_id: string; operating_mode: string }> }> {
  return apiRequest('/payments/mp/terminals');
}

export async function setMpDefaultTerminal(terminal_id: string): Promise<{ success: boolean }> {
  return apiRequest('/payments/mp/terminals/default', {
    method: 'POST',
    body: JSON.stringify({ terminal_id }),
  });
}

export async function mpCharge(order_id: number, terminal_id?: string): Promise<{ success: boolean; mp_order_id: string; payment_intent_id: string }> {
  return apiRequest('/payments/mp/charge', {
    method: 'POST',
    body: JSON.stringify({ order_id, terminal_id }),
  });
}

export async function mpCancelCharge(order_id: number): Promise<{ success: boolean }> {
  return apiRequest('/payments/mp/cancel', {
    method: 'POST',
    body: JSON.stringify({ order_id }),
  });
}

/* ==================== Credentials / Integrations ==================== */

export interface ServiceField {
  key: string;
  label: string;
  secret: boolean;
}

export interface ServiceSchema {
  label: string;
  fields: ServiceField[];
}

export async function getCredentialsSchema(): Promise<Record<string, ServiceSchema>> {
  return apiRequest('/credentials/schema');
}

export async function getCredentials(): Promise<Record<string, Record<string, string>>> {
  // Uses owner token
  const base = IOS_FALLBACK_URLS.length ? await resolveBaseUrl() : activeBaseUrl;
  const ownerToken = localStorage.getItem('owner_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ownerToken) headers['Authorization'] = `Bearer ${ownerToken}`;
  const tenantId = localStorage.getItem('tenant_id');
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  const res = await fetch(`${base}/credentials`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API Error: ${res.status}`);
  }
  return res.json();
}

export async function saveCredentials(service: string, values: Record<string, string>): Promise<{ success: boolean }> {
  const base = IOS_FALLBACK_URLS.length ? await resolveBaseUrl() : activeBaseUrl;
  const ownerToken = localStorage.getItem('owner_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ownerToken) headers['Authorization'] = `Bearer ${ownerToken}`;
  const tenantId = localStorage.getItem('tenant_id');
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  const res = await fetch(`${base}/credentials/${service}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(values),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API Error: ${res.status}`);
  }
  return res.json();
}

/* ==================== Stress Test ==================== */

export async function getStressTestTemplates(): Promise<StressTestTemplate[]> {
  return apiRequest<StressTestTemplate[]>('/stress-test/templates');
}

export async function runStressTest(
  config: StressTestConfig,
  onProgress: (event: StressTestProgress) => void,
  onComplete: (results: StressTestResults) => void,
  onError: (error: string) => void,
): Promise<void> {
  const base = IOS_FALLBACK_URLS.length ? await resolveBaseUrl() : activeBaseUrl;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (currentEmployeeToken) headers['Authorization'] = `Bearer ${currentEmployeeToken}`;
  const tenantId = localStorage.getItem('tenant_id');
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  const response = await fetch(`${base}/stress-test/run`, {
    method: 'POST',
    headers,
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `API Error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let currentEvent = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (currentEvent === 'progress') {
            onProgress(data as StressTestProgress);
          } else if (currentEvent === 'complete') {
            onComplete(data as StressTestResults);
          } else if (currentEvent === 'error') {
            onError(data.message || 'Unknown error');
          }
        } catch {
          // Skip malformed JSON
        }
        currentEvent = '';
      }
    }
  }
}

export async function getStressTestResidual(): Promise<StressTestResidual> {
  return apiRequest<StressTestResidual>('/stress-test/residual');
}

export async function cleanupStressTestData(): Promise<{ deleted: number }> {
  return apiRequest<{ deleted: number }>('/stress-test/cleanup', { method: 'DELETE' });
}

export async function deleteCredentials(service: string): Promise<{ success: boolean }> {
  const base = IOS_FALLBACK_URLS.length ? await resolveBaseUrl() : activeBaseUrl;
  const ownerToken = localStorage.getItem('owner_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ownerToken) headers['Authorization'] = `Bearer ${ownerToken}`;
  const tenantId = localStorage.getItem('tenant_id');
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  const res = await fetch(`${base}/credentials/${service}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API Error: ${res.status}`);
  }
  return res.json();
}

