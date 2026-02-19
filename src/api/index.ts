import {
  Employee,
  MenuCategory,
  MenuItem,
  Order,
  OrderItem,
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
  FinancialProjection,
  LoyaltyCustomer,
  StampCard,
  StampResult,
  LoyaltyAnalytics,
  LoyaltyConfig,
  ReferralEvent,
  PaginatedResponse,
  OrderTemplate,
} from '../types';

// Employee ID for auth header - set after login
let currentEmployeeId: number | null = null;

export function setCurrentEmployeeId(id: number | null) {
  currentEmployeeId = id;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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
  if (currentEmployeeId) {
    defaultHeaders['x-employee-id'] = String(currentEmployeeId);
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
  return data as T;
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

/* ==================== Order Endpoints ==================== */

interface OrderFilters {
  status?: string;
  date?: string;
}

export async function getOrders(filters?: OrderFilters): Promise<Order[]> {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.date) queryParams.append('date', filters.date);

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
