/* Employee Types */
export interface Employee {
  id: number;
  name: string;
  pin?: string;
  role: 'cashier' | 'kitchen' | 'bar' | 'manager' | 'admin';
  active: boolean;
  created_at: string;
  permissions?: string[];
  token?: string;
}

export interface RolePermission {
  role: string;
  permission: string;
  granted: boolean;
}

/* Menu Types */
export interface MenuCategory {
  id: number;
  name: string;
  sort_order: number;
  active: boolean;
}

export interface MenuItem {
  id: number;
  category_id: number;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  active: boolean;
}

/* Virtual Brand Types */
export interface VirtualBrand {
  id: number;
  name: string;
  slug: string;
  primary_color: string;
  secondary_color?: string;
  items: VirtualBrandItem[];
}

export interface VirtualBrandItem {
  menu_item_id: number;
  custom_name: string | null;
  custom_price: number | null;
  category_id: number;
}

/* Order Types */
export interface OrderItem {
  id?: number;
  order_id?: number;
  menu_item_id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
  combo_instance_id?: string | null;
  modifiers?: OrderItemModifier[];
  virtual_brand_id?: number | null;
  brand_name?: string;
  brand_color?: string;
}

export interface CartItem extends OrderItem {
  cart_id: string;
  menuItem?: MenuItem;
  selectedModifierIds?: number[];
  selectedModifierNames?: string[];
  virtual_brand_id?: number | null;
}

export interface Order {
  id: number;
  order_number: string;
  employee_id: number;
  employee_name?: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  payment_intent_id?: string;
  payment_status: 'unpaid' | 'processing' | 'paid' | 'completed' | 'failed' | 'refunded';
  payment_method?: 'card' | 'cash' | 'split' | 'crypto' | null;
  source?: 'pos' | 'uber_eats' | 'rappi' | 'didi_food';
  created_at: string;
  completed_at?: string;
  items?: OrderItem[];
}

/* Inventory Types */
export interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  category: string;
  cost_price?: number;
  sku?: string;
  barcode?: string;
  expiry_date?: string;
  lot_number?: string;
}

/* Waste Types */
export interface WasteLogEntry {
  id: number;
  inventory_item_id: number;
  item_name: string;
  quantity: number;
  unit: string;
  reason: 'spoilage' | 'prep_error' | 'dropped' | 'expired' | 'other';
  cost_at_time: number;
  notes?: string;
  logged_by_name?: string;
  created_at: string;
}

export interface WasteReport {
  summary: {
    total_waste_cost: number;
    total_entries: number;
    by_reason: Record<string, { count: number; cost: number }>;
  };
  by_item: Array<{
    inventory_item_id: number;
    name: string;
    unit: string;
    total_quantity: number;
    total_cost: number;
    entry_count: number;
    top_reason: string;
    waste_rate?: number;
  }>;
  daily_trend: Array<{ date: string; total_cost: number; entry_count: number }>;
}

export interface COGSSummary {
  period: string;
  start_date: string;
  revenue: number;
  cogs: number;
  waste_cost: number;
  total_food_cost: number;
  food_cost_percent: number;
  gross_profit: number;
  gross_margin_percent: number;
}

export interface ScanSession {
  item: InventoryItem;
  quantity: number;
  scanned_at: string;
}

/* Payment Types */
export interface PaymentIntent {
  client_secret: string;
  payment_intent_id: string;
  amount: number;
}

export interface PaymentStatus {
  status: 'unpaid' | 'processing' | 'completed' | 'failed' | 'refunded';
  payment_intent_id?: string;
  amount?: number;
}

/* Report Types */
export interface SalesReport {
  period: string;
  total_revenue: number;
  order_count: number;
  avg_ticket: number;
  tip_total: number;
  data?: any[];
}

export interface TopItemsReport {
  item_name: string;
  quantity_sold: number;
  revenue: number;
}

export interface EmployeePerformanceReport {
  employee_id: number;
  employee_name: string;
  orders_processed: number;
  total_sales: number;
  avg_ticket: number;
  tips_received: number;
}

export interface HourlyReport {
  hour: number;
  orders: number;
  revenue: number;
  avg_ticket: number;
}

/* AI Suggestion Types */
export interface AISuggestion {
  type: string;
  priority: number;
  data: {
    rule: string;
    suggested_item_id: number;
    suggested_item_name: string;
    suggested_item_price: number;
    savings?: number;
    message: string;
  };
}

export interface InventoryPushItem {
  menu_item_id: number;
  name: string;
  price: number;
  category_id: number;
  category_name: string;
  reason: string;
  ingredient_name?: string;
}

export interface InventoryPushData {
  pushItems: InventoryPushItem[];
  avoidItems: InventoryPushItem[];
  lowIngredients?: Array<{
    id: number;
    name: string;
    quantity: number;
    unit: string;
    low_stock_threshold: number;
  }>;
  soldOutItemIds?: number[];
  lowStockItemIds?: number[];
}

export interface AIConfig {
  [key: string]: {
    value: string;
    description: string | null;
    updated_at: string | null;
  };
}

export interface AISuggestionFeedback {
  suggestion_type: string;
  suggestion_data?: any;
  action: 'accepted' | 'dismissed';
  employee_id?: number;
  order_id?: number;
}

export interface AIInsights {
  inventory: {
    pushItems: number;
    avoidItems: number;
    lowIngredients: number;
  };
  suggestions: {
    totalEvents: number;
    accepted: number;
    acceptanceRate: number;
  };
  topItemPairs: Array<{
    item_a_id: number;
    item_b_id: number;
    pair_count: number;
    item_a_name: string;
    item_b_name: string;
  }>;
  recentSnapshots: Array<{
    snapshot_hour: string;
    order_count: number;
    revenue: number;
    avg_ticket: number;
  }>;
  grokStats: {
    enabled: boolean;
    apiKeySet: boolean;
    callsThisHour: number;
    maxCallsPerHour: number;
    model: string;
  };
  aiStatus: {
    initialized: boolean;
    scheduler: {
      running: boolean;
      jobs: Array<{
        name: string;
        intervalMs: number;
        lastRun: string | null;
        runCount: number;
      }>;
    };
  };
}

export interface AIAnalytics {
  period: string;
  byType: Array<{ suggestion_type: string; action: string; count: number }>;
  dailyTrend: Array<{ date: string; action: string; count: number }>;
  aiRevenue: { itemsSold: number; revenue: number };
}

export interface PricingSuggestion {
  id: string;
  type: 'markup' | 'discount';
  menu_item_id: number;
  item_name: string;
  current_price: number;
  suggested_price: number;
  change_percent: number;
  reason: string;
  requires_approval: boolean;
}

export interface InventoryForecast {
  inventory_item_id: number;
  name: string;
  current_quantity: number;
  unit: string;
  category: string;
  avg_daily_usage: number;
  days_until_stockout: number | null;
  days_until_low: number | null;
  suggested_reorder_qty: number | null;
  risk_level: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
  data_days: number;
  message?: string;
}

export interface CategoryRole {
  id: number;
  category_id: number;
  role: string;
  category_name: string;
}

/* Inventory Insights Types */
export interface InventoryInsightsKPIs {
  itemsAtRisk: number;
  criticalCount: number;
  highCount: number;
  prepActionsNeeded: number;
  wasteTrendPercent: number;
  acceptanceRate: number;
}

export interface VelocityDayData {
  date: string;
  quantity_used: number;
  orders_count: number;
}

export interface VelocityChartItem {
  inventory_item_id: number;
  name: string;
  total_used: number;
  daily: VelocityDayData[];
}

export interface WasteAlertData {
  inventory_item_id?: number;
  item_name?: string;
  waste_rate?: number;
  total_waste_cost?: number;
  top_reason?: string;
  message?: string;
  data?: Record<string, unknown>;
  type?: string;
}

export interface WasteDailyTrend {
  date: string;
  total_cost: number;
  entry_count: number;
}

export interface InventoryInsights {
  kpis: InventoryInsightsKPIs;
  forecasts: InventoryForecast[];
  prepForecast: PrepForecast;
  velocityChart: VelocityChartItem[];
  wasteAlerts: WasteAlertData[];
  pushItems: InventoryPushItem[];
  avoidItems: InventoryPushItem[];
  wasteDailyTrend: WasteDailyTrend[];
}

/* Financial Report Types */
export interface CashCardBreakdown {
  period: string;
  total_orders: number;
  total_revenue: number;
  breakdown: Array<{
    payment_method: string;
    count: number;
    total: number;
    tips: number;
    percentage: number;
    revenue_percentage: number;
  }>;
}

export interface COGSReport {
  period: string;
  items: Array<{
    menu_item_id: number;
    item_name: string;
    quantity_sold: number;
    revenue: number;
    cogs: number;
    margin: number;
    margin_percent: number;
  }>;
  totals: {
    total_revenue: number;
    total_cogs: number;
    total_margin: number;
    overall_margin_percent: number;
  };
}

export interface CategoryMargins {
  period: string;
  categories: Array<{
    category_id: number;
    category_name: string;
    quantity_sold: number;
    revenue: number;
    cogs: number;
    margin: number;
    margin_percent: number;
  }>;
}

export interface ContributionMarginReport {
  period: string;
  data: Array<{
    date: string;
    revenue: number;
    cogs: number;
    contribution_margin: number;
    margin_percent: number;
    orders: number;
  }>;
}

export interface LiveDashboardData {
  date: string;
  kpis: {
    order_count: number;
    revenue: number;
    avg_ticket: number;
    tips: number;
    cash_orders: number;
    card_orders: number;
    cash_revenue: number;
    card_revenue: number;
  };
  hourly: Array<{ hour: number; orders: number; revenue: number }>;
  sources: Array<{ source: string; count: number; revenue: number }>;
  topItems: Array<{ item_name: string; qty: number }>;
}

/* Modifier Types */
export interface ModifierGroup {
  id: number;
  name: string;
  selection_type: 'single' | 'multi';
  required: boolean;
  min_selections: number;
  max_selections: number;
  sort_order: number;
  active: boolean;
  modifiers?: Modifier[];
}

export interface Modifier {
  id: number;
  group_id: number;
  name: string;
  price_adjustment: number;
  sort_order: number;
  active: boolean;
}

export interface OrderItemModifier {
  id: number;
  order_item_id: number;
  modifier_id: number;
  modifier_name: string;
  price_adjustment: number;
}

/* Combo Types */
export interface ComboDefinition {
  id: number;
  name: string;
  description: string;
  combo_price: number;
  active: boolean;
  slots?: ComboSlot[];
}

export interface ComboSlot {
  id: number;
  combo_id: number;
  slot_label: string;
  category_id: number | null;
  specific_item_id: number | null;
  sort_order: number;
}

/* Split Payment Types */
export interface OrderPayment {
  id: number;
  order_id: number;
  payment_method: 'card' | 'cash';
  amount: number;
  tip: number;
  payment_intent_id?: string;
  status: string;
}

/* Printer Types */
export interface Printer {
  id: number;
  name: string;
  printer_type: string;
  address: string;
  active: boolean;
}

/* Delivery Types */
export interface DeliveryPlatform {
  id: number;
  name: string;
  display_name: string;
  commission_percent: number;
  active: boolean;
}

export interface DeliveryOrder {
  id: number;
  order_id: number;
  platform_id: number;
  external_order_id: string;
  platform_status: string;
  delivery_fee: number;
  platform_commission: number;
  customer_name: string;
  delivery_address: string;
}

/* Refund Types */
export interface Refund {
  id: number;
  order_id: number;
  stripe_refund_id?: string;
  amount: number;
  reason: string;
  refund_type: 'full' | 'partial_items' | 'partial_amount';
  refunded_by?: number;
  refunded_by_name?: string;
  items_json?: string;
  inventory_restored: boolean;
  created_at: string;
}

/* Crypto Payment Types */
export type CryptoPaymentStatus =
  | 'waiting'
  | 'confirming'
  | 'confirmed'
  | 'sending'
  | 'partially_paid'
  | 'finished'
  | 'failed'
  | 'expired'
  | 'refunded';

export interface CryptoPayment {
  crypto_payment_id: number;
  nowpayments_payment_id: string;
  order_id: number;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  price_amount: number;
  status: CryptoPaymentStatus;
  actually_paid: number;
}

export interface CryptoEstimate {
  estimated_amount: number;
  currency_from: string;
  currency_to: string;
}

export interface ReconciliationRow {
  order_id: number;
  order_number: string;
  order_total: number;
  stripe_amount: number;
  stripe_fee: number;
  net_amount: number;
  matched: boolean;
  payment_intent_id: string;
}

export interface PaymentFeeSummary {
  period: string;
  total_revenue: number;
  total_fees: number;
  net_revenue: number;
  fee_percent: number;
  daily: Array<{
    date: string;
    revenue: number;
    fees: number;
    net: number;
    order_count: number;
  }>;
}

export interface RefundSummary {
  total_refunds: number;
  total_refunded_amount: number;
  by_reason: Array<{ reason: string; count: number; amount: number }>;
  by_employee: Array<{ employee_name: string; count: number; amount: number }>;
  daily: Array<{ date: string; count: number; amount: number }>;
}

/* Advanced Inventory Types */
export interface InventoryCount {
  id: number;
  inventory_item_id: number;
  item_name?: string;
  unit?: string;
  counted_quantity: number;
  system_quantity: number;
  variance: number;
  variance_percent: number;
  counted_by?: number;
  counted_by_name?: string;
  notes?: string;
  created_at: string;
}

export interface ShrinkageAlert {
  id: number;
  inventory_item_id: number;
  item_name?: string;
  unit?: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  variance_amount: number;
  acknowledged: boolean;
  acknowledged_by?: number;
  created_at: string;
}

export interface VarianceReport {
  inventory_item_id: number;
  name: string;
  unit: string;
  category: string;
  count_sessions: number;
  avg_variance: number;
  avg_variance_percent: number;
  total_variance: number;
  last_counted: string;
}

export interface Vendor {
  id: number;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  active: boolean;
  created_at: string;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  vendor_id: number;
  vendor_name?: string;
  status: 'draft' | 'submitted' | 'partial' | 'received' | 'cancelled';
  total_amount: number;
  notes?: string;
  created_by?: number;
  created_by_name?: string;
  submitted_at?: string;
  received_at?: string;
  created_at: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: number;
  po_id: number;
  inventory_item_id: number;
  item_name?: string;
  unit?: string;
  quantity_ordered: number;
  unit_cost: number;
  quantity_received: number;
  line_total: number;
}

export interface PrepForecast {
  target_date: string;
  day_of_week: string;
  estimated_orders: number;
  items: Array<{
    inventory_item_id: number;
    item_name: string;
    unit: string;
    expected_quantity_needed: number;
    current_stock: number;
    deficit: number;
    prep_action: 'restock_needed' | 'prep_extra' | 'sufficient';
    velocity_estimate: number;
    menu_items_using: Array<{
      menu_item_name: string;
      avg_sold: number;
      ingredient_per_item: number;
    }>;
  }>;
}

/* Financial Projection Types */
export interface FinancialTargetRow {
  category: string;
  label: string;
  auto_calculated: boolean;
  target_percent: number;
  target_amount: number;
  actual_amount: number;
  diff_amount: number;
  diff_percent: number;
}

export interface FinancialProjection {
  month: string;
  revenue: number;
  rows: FinancialTargetRow[];
  net_profit: number;
  target_net_profit: number;
}

/* Loyalty / CRM Types */
export interface LoyaltyCustomer {
  id: number;
  phone: string;
  name: string;
  referral_code: string;
  referred_by: number | null;
  store_id: number;
  stamps_earned: number;
  orders_count: number;
  total_spent: number;
  last_visit: string | null;
  sms_opt_in: number;
  created_at: string;
  activeCard?: StampCard;
}

export interface StampCard {
  id: number;
  customer_id: number;
  stamps_earned: number;
  stamps_required: number;
  reward_description: string;
  completed: number;
  redeemed: number;
  completed_at: string | null;
  redeemed_at: string | null;
  created_at: string;
}

export interface StampEvent {
  id: number;
  stamp_card_id: number;
  order_id: number | null;
  stamps_added: number;
  event_type: 'purchase' | 'referral_bonus' | 'manual';
  created_at: string;
  stamps_required?: number;
}

export interface ReferralEvent {
  id: number;
  referrer_id: number;
  referee_id: number;
  referrer_stamps_added: number;
  referee_stamps_added: number;
  referrer_name?: string;
  referee_name?: string;
  created_at: string;
}

export interface LoyaltyAnalytics {
  totalMembers: number;
  newThisMonth: number;
  activeCards: number;
  completedCards: number;
  redeemedCards: number;
  redemptionRate: number;
  topCustomers: LoyaltyCustomer[];
  signupsByMonth: Array<{ month: string; count: number }>;
}

export interface LoyaltyConfig {
  [key: string]: {
    value: string;
    description: string | null;
    updated_at: string | null;
  };
}

export interface StampResult {
  stampCard: StampCard;
  cardCompleted: boolean;
  customer: LoyaltyCustomer;
}

/* Order Template Types */
export interface OrderTemplate {
  id: number;
  name: string;
  description?: string;
  items: Array<{ menu_item_id: number; quantity: number }>;
  items_json?: string;
  created_by?: number;
  active: boolean;
  sort_order: number;
  created_at: string;
}

/* API Response Types */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
