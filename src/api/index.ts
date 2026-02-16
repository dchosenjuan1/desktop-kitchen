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
  AISuggestion,
  InventoryPushData,
  AISuggestionFeedback,
  AIConfig,
  AIInsights,
  AIAnalytics,
  PricingSuggestion,
  InventoryForecast,
  CategoryRole,
} from '../types';

const API_BASE_URL = '/api';

/* ==================== Base API Client ==================== */

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

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

export async function getCategories(): Promise<MenuCategory[]> {
  return apiRequest<MenuCategory[]>('/menu/categories');
}

export async function getMenuItems(categoryId?: string): Promise<MenuItem[]> {
  const endpoint = categoryId
    ? `/menu/items?category_id=${categoryId}`
    : '/menu/items';
  return apiRequest<MenuItem[]>(endpoint);
}

export async function toggleMenuItem(id: number): Promise<any> {
  return apiRequest(`/menu/items/${id}/toggle`, { method: 'PUT' });
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
  items: { menu_item_id: number; quantity: number; notes?: string }[];
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
}

export async function refundPayment(data: RefundPaymentData): Promise<any> {
  return apiRequest('/payments/refund', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getPaymentStatus(orderId: number): Promise<any> {
  return apiRequest(`/payments/${orderId}`);
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
