import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import { BrandingProvider } from './context/BrandingContext';
import { PlanProvider } from './context/PlanContext';
import { ToastProvider } from './context/ToastContext';
import { resolveTenant, type TenantInfo } from './lib/tenantResolver';
import { useDeviceType } from './hooks/useDeviceType';
import { setCurrentEmployeeId, setCurrentEmployeeToken } from './api';
import { MobileCartProvider } from './context/MobileCartContext';
import DemoLoadingScreen from './components/DemoLoadingScreen';
import UpgradeCTABar from './components/UpgradeCTABar';
import AIAssistantFAB from './components/AIAssistantFAB';

// Screens - these will be created as separate components
// For now, we'll create placeholder components
const LoginScreen = React.lazy(() =>
  import('./screens/LoginScreen').then((module) => ({
    default: module.default || (() => <div>Login Screen</div>),
  }))
);

const POSScreen = React.lazy(() =>
  import('./screens/POSScreen').then((module) => ({
    default: module.default || (() => <div>POS Screen</div>),
  }))
);

const KitchenDisplay = React.lazy(() =>
  import('./screens/KitchenDisplay').then((module) => ({
    default: module.default || (() => <div>Kitchen Display</div>),
  }))
);

const AdminPanel = React.lazy(() =>
  import('./screens/AdminPanel').then((module) => ({
    default: module.default || (() => <div>Admin Panel</div>),
  }))
);

const InventoryScreen = React.lazy(() =>
  import('./screens/InventoryScreen').then((module) => ({
    default: module.default || (() => <div>Inventory Screen</div>),
  }))
);

const EmployeeScreen = React.lazy(() =>
  import('./screens/EmployeeScreen').then((module) => ({
    default: module.default || (() => <div>Employee Screen</div>),
  }))
);

const ReportsScreen = React.lazy(() =>
  import('./screens/ReportsScreen').then((module) => ({
    default: module.default || (() => <div>Reports Screen</div>),
  }))
);

const MenuManagement = React.lazy(() =>
  import('./screens/MenuManagement').then((module) => ({
    default: module.default || (() => <div>Menu Management</div>),
  }))
);

const RecipeManagement = React.lazy(() =>
  import('./screens/RecipeManagement').then((module) => ({
    default: module.default || (() => <div>Recipe Management</div>),
  }))
);

const AIConfigScreen = React.lazy(() =>
  import('./screens/AIConfigScreen').then((module) => ({
    default: module.default || (() => <div>AI Config</div>),
  }))
);

const DynamicPricingScreen = React.lazy(() =>
  import('./screens/DynamicPricingScreen').then((module) => ({
    default: module.default || (() => <div>Dynamic Pricing</div>),
  }))
);

const LiveDashboardScreen = React.lazy(() =>
  import('./screens/LiveDashboardScreen').then((module) => ({
    default: module.default || (() => <div>Live Dashboard</div>),
  }))
);

const ModifierManagement = React.lazy(() =>
  import('./screens/ModifierManagement').then((module) => ({
    default: module.default || (() => <div>Modifier Management</div>),
  }))
);

const PrinterManagement = React.lazy(() =>
  import('./screens/PrinterManagement').then((module) => ({
    default: module.default || (() => <div>Printer Management</div>),
  }))
);

const DeliveryScreen = React.lazy(() =>
  import('./screens/DeliveryScreen').then((module) => ({
    default: module.default || (() => <div>Delivery Screen</div>),
  }))
);

const PermissionsScreen = React.lazy(() =>
  import('./screens/PermissionsScreen').then((module) => ({
    default: module.default || (() => <div>Permissions Screen</div>),
  }))
);

const PurchaseOrderScreen = React.lazy(() =>
  import('./screens/PurchaseOrderScreen').then((module) => ({
    default: module.default || (() => <div>Purchase Orders</div>),
  }))
);

const PrepForecastScreen = React.lazy(() =>
  import('./screens/PrepForecastScreen').then((module) => ({
    default: module.default || (() => <div>Prep Forecast</div>),
  }))
);

const LoyaltyScreen = React.lazy(() =>
  import('./screens/LoyaltyScreen').then((module) => ({
    default: module.default || (() => <div>Loyalty</div>),
  }))
);

const OnboardingScreen = React.lazy(() =>
  import('./screens/OnboardingScreen').then((module) => ({
    default: module.default || (() => <div>Onboarding</div>),
  }))
);

const MenuBoardScreen = React.lazy(() =>
  import('./screens/MenuBoardScreen').then((module) => ({
    default: module.default || (() => <div>Menu Board</div>),
  }))
);

const CustomerOrderScreen = React.lazy(() =>
  import('./screens/CustomerOrderScreen').then((module) => ({
    default: module.default || (() => <div>Customer Order</div>),
  }))
);

const MenuBoardManagement = React.lazy(() =>
  import('./screens/MenuBoardManagement').then((module) => ({
    default: module.default || (() => <div>Menu Board Management</div>),
  }))
);

const BrandingSettingsScreen = React.lazy(() =>
  import('./screens/BrandingSettingsScreen').then((module) => ({
    default: module.default || (() => <div>Branding Settings</div>),
  }))
);

const InvoicingScreen = React.lazy(() =>
  import('./screens/InvoicingScreen').then((module) => ({
    default: module.default || (() => <div>Invoicing</div>),
  }))
);

const PublicInvoiceScreen = React.lazy(() =>
  import('./screens/PublicInvoiceScreen').then((module) => ({
    default: module.default || (() => <div>Public Invoice</div>),
  }))
);

const SuperAdminDashboard = React.lazy(() =>
  import('./screens/SuperAdminDashboard').then((module) => ({
    default: module.default || (() => <div>Super Admin</div>),
  }))
);

const PlatformGateway = React.lazy(() =>
  import('./screens/PlatformGateway').then((module) => ({
    default: module.default || (() => <div>Platform Gateway</div>),
  }))
);

const ResetPasswordScreen = React.lazy(() =>
  import('./screens/ResetPasswordScreen').then((module) => ({
    default: module.default || (() => <div>Reset Password</div>),
  }))
);

const AccountScreen = React.lazy(() =>
  import('./screens/AccountScreen').then((module) => ({
    default: module.default || (() => <div>Account</div>),
  }))
);

const IntegrationsScreen = React.lazy(() =>
  import('./screens/IntegrationsScreen').then((module) => ({
    default: module.default || (() => <div>Integrations</div>),
  }))
);

const StressTestScreen = React.lazy(() =>
  import('./screens/StressTestScreen').then((module) => ({
    default: module.default || (() => <div>Stress Test</div>),
  }))
);

const BankingPage = React.lazy(() =>
  import('./components/banking/BankingPage').then((module) => ({
    default: module.default || (() => <div>Banking</div>),
  }))
);

const FinancingScreen = React.lazy(() =>
  import('./screens/FinancingScreen').then((module) => ({
    default: module.default || (() => <div>Financing</div>),
  }))
);

const SettlementScreen = React.lazy(() =>
  import('./screens/SettlementScreen').then((module) => ({
    default: module.default || (() => <div>Settlement</div>),
  }))
);

const ExpensesScreen = React.lazy(() =>
  import('./screens/ExpensesScreen').then((module) => ({
    default: module.default || (() => <div>Expenses</div>),
  }))
);

const MobileShell = React.lazy(() =>
  import('./components/mobile/MobileShell').then((module) => ({
    default: module.default,
  }))
);

const MobileOrdersScreen = React.lazy(() =>
  import('./screens/mobile/MobileOrdersScreen').then((module) => ({
    default: module.default,
  }))
);

const MobileKitchenScreen = React.lazy(() =>
  import('./screens/mobile/MobileKitchenScreen').then((module) => ({
    default: module.default,
  }))
);

const MobileScannerScreen = React.lazy(() =>
  import('./screens/mobile/MobileScannerScreen').then((module) => ({
    default: module.default,
  }))
);

const MobileProfileScreen = React.lazy(() =>
  import('./screens/mobile/MobileProfileScreen').then((module) => ({
    default: module.default,
  }))
);

const MobilePOSScreen = React.lazy(() =>
  import('./screens/mobile/MobilePOSScreen').then((module) => ({
    default: module.default,
  }))
);

const MobileCartScreen = React.lazy(() =>
  import('./screens/mobile/MobileCartScreen').then((module) => ({
    default: module.default,
  }))
);

/* ==================== Tenant Context ==================== */

const TenantContext = React.createContext<TenantInfo>({
  mode: 'local',
  tenantSlug: null,
  isPlatformHost: false,
});

export const useTenant = () => React.useContext(TenantContext);

/* ==================== Admin AI FAB ==================== */

const ROUTE_CONTEXT_MAP: Record<string, string> = {
  '/admin/menu': 'menu',
  '/admin/recipes': 'recipes',
  '/admin/inventory': 'inventory',
  '/admin/employees': 'employees',
  '/admin/reports': 'reports',
  '/admin/ai': 'ai',
  '/admin/pricing': 'pricing',
  '/admin/dashboard': 'reports',
  '/admin/delivery': 'delivery',
  '/admin/prep-forecast': 'prep-forecast',
  '/admin/loyalty': 'loyalty',
  '/admin/expenses': 'expenses',
  '/admin': 'admin',
};

function AdminAIFAB() {
  const { currentEmployee } = useAuth();
  const location = useLocation();
  const isAdmin = currentEmployee && ['manager', 'admin'].includes(currentEmployee.role);
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (!isAdmin || !isAdminRoute) return null;

  const ctx = ROUTE_CONTEXT_MAP[location.pathname] || undefined;
  return <AIAssistantFAB screenContext={ctx} />;
}

/* ==================== Protected Route ==================== */

interface ProtectedRouteProps {
  element: React.ReactNode;
  requiredRole?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  element,
  requiredRole,
}) => {
  const { currentEmployee } = useAuth();

  if (!currentEmployee) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && !requiredRole.includes(currentEmployee.role)) {
    return <Navigate to="/pos" replace />;
  }

  return <>{element}</>;
};

/* ==================== App Component ==================== */

const LoadingFallback: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950">
      <div className="text-2xl text-brand-600 font-bold animate-pulse">{t('states.loading')}</div>
    </div>
  );
};

/* ==================== Platform Routes (pos.desktop.kitchen) ==================== */

const PlatformRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<PlatformGateway />} />
    <Route path="/onboarding" element={<OnboardingScreen />} />
    <Route path="/reset-password" element={<ResetPasswordScreen />} />
    <Route path="/super-admin" element={<SuperAdminDashboard />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

/* ==================== Tenant Routes ({slug}.desktop.kitchen / localhost) ==================== */

// Public routes that should never be intercepted by the mobile POS shell
const PUBLIC_PATHS = ['/order', '/menu-board', '/invoice/'];

const TenantRoutes: React.FC = () => {
  const { currentEmployee } = useAuth();
  const { deviceType } = useDeviceType();

  // Check if the current hash path is a public route (customer-facing, no auth)
  const hashPath = window.location.hash.replace('#', '') || '/';
  const isPublicRoute = PUBLIC_PATHS.some(p => hashPath.startsWith(p));

  // Phone + authenticated → mobile POS mode (but not for public customer pages)
  if (deviceType === 'phone' && currentEmployee && !isPublicRoute) {
    return (
      <MobileCartProvider>
        <MobileShell>
          <Routes>
            <Route path="/m/pos" element={<MobilePOSScreen />} />
            <Route path="/m/cart" element={<MobileCartScreen />} />
            <Route path="/m/orders" element={<MobileOrdersScreen />} />
            <Route path="/m/kitchen" element={<MobileKitchenScreen />} />
            <Route
              path="/m/scan"
              element={
                <ProtectedRoute
                  element={<MobileScannerScreen />}
                  requiredRole={['manager', 'admin']}
                />
              }
            />
            <Route path="/m/profile" element={<MobileProfileScreen />} />
            <Route path="*" element={<Navigate to="/m/pos" replace />} />
          </Routes>
        </MobileShell>
      </MobileCartProvider>
    );
  }

  return (
    <>
    <Routes>
      {/* Login Route - accessible to everyone */}
      <Route path="/" element={<LoginScreen />} />

      {/* Onboarding - new restaurant setup */}
      <Route path="/onboarding" element={<OnboardingScreen />} />

      {/* POS Screen - requires authentication */}
      <Route
        path="/pos"
        element={
          <ProtectedRoute
            element={<POSScreen />}
            requiredRole={['cashier', 'manager', 'admin']}
          />
        }
      />

      {/* Kitchen Display - requires authentication */}
      <Route
        path="/kitchen"
        element={
          <ProtectedRoute
            element={<KitchenDisplay />}
            requiredRole={['kitchen', 'bar', 'manager', 'admin']}
          />
        }
      />

      {/* Admin Panel - requires manager/admin role */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute
            element={<AdminPanel />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Inventory Management - requires manager/admin role */}
      <Route
        path="/admin/inventory"
        element={
          <ProtectedRoute
            element={<InventoryScreen />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Employee Management - requires admin role */}
      <Route
        path="/admin/employees"
        element={
          <ProtectedRoute
            element={<EmployeeScreen />}
            requiredRole={['admin']}
          />
        }
      />

      {/* Reports - requires manager/admin role */}
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute
            element={<ReportsScreen />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Menu Management - requires manager/admin role */}
      <Route
        path="/admin/menu"
        element={
          <ProtectedRoute
            element={<MenuManagement />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Recipe Management - requires manager/admin role */}
      <Route
        path="/admin/recipes"
        element={
          <ProtectedRoute
            element={<RecipeManagement />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* AI Intelligence - requires manager/admin role */}
      <Route
        path="/admin/ai"
        element={
          <ProtectedRoute
            element={<AIConfigScreen />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Dynamic Pricing - requires manager/admin role */}
      <Route
        path="/admin/pricing"
        element={
          <ProtectedRoute
            element={<DynamicPricingScreen />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Live Dashboard */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute
            element={<LiveDashboardScreen />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Modifier Management */}
      <Route
        path="/admin/modifiers"
        element={
          <ProtectedRoute
            element={<ModifierManagement />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Printer Management */}
      <Route
        path="/admin/printers"
        element={
          <ProtectedRoute
            element={<PrinterManagement />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Delivery Management */}
      <Route
        path="/admin/delivery"
        element={
          <ProtectedRoute
            element={<DeliveryScreen />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Permissions - admin only */}
      <Route
        path="/admin/permissions"
        element={
          <ProtectedRoute
            element={<PermissionsScreen />}
            requiredRole={['admin']}
          />
        }
      />

      {/* Purchase Orders */}
      <Route
        path="/admin/purchase-orders"
        element={
          <ProtectedRoute
            element={<PurchaseOrderScreen />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Prep Forecast */}
      <Route
        path="/admin/prep-forecast"
        element={
          <ProtectedRoute
            element={<PrepForecastScreen />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Loyalty & CRM */}
      <Route
        path="/admin/loyalty"
        element={
          <ProtectedRoute
            element={<LoyaltyScreen />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Branding Settings — manager/admin */}
      <Route
        path="/admin/branding"
        element={
          <ProtectedRoute
            element={<BrandingSettingsScreen />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Menu Board Management — manager/admin */}
      <Route
        path="/admin/menu-board"
        element={
          <ProtectedRoute
            element={<MenuBoardManagement />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Invoicing — CFDI electronic invoicing */}
      <Route
        path="/admin/invoicing"
        element={
          <ProtectedRoute
            element={<InvoicingScreen />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Account — owner portal */}
      <Route
        path="/admin/account"
        element={
          <ProtectedRoute
            element={<AccountScreen />}
          />
        }
      />

      {/* Integrations — owner credential management */}
      <Route
        path="/admin/integrations"
        element={
          <ProtectedRoute
            element={<IntegrationsScreen />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Financing — all plans (free sees UpgradePrompt) */}
      <Route
        path="/admin/financing"
        element={
          <ProtectedRoute
            element={<FinancingScreen />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Settlement — all plans */}
      <Route
        path="/admin/settlement"
        element={
          <ProtectedRoute
            element={<SettlementScreen />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Banking — pro only */}
      <Route
        path="/admin/banking"
        element={
          <ProtectedRoute
            element={<BankingPage />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Expenses — manager/admin */}
      <Route
        path="/admin/expenses"
        element={
          <ProtectedRoute
            element={<ExpensesScreen />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Stress Test — pro only */}
      <Route
        path="/admin/stress-test"
        element={
          <ProtectedRoute
            element={<StressTestScreen />}
            requiredRole={['manager', 'admin']}
          />
        }
      />

      {/* Super Admin — self-contained auth */}
      <Route path="/super-admin" element={<SuperAdminDashboard />} />

      {/* Menu Board — public, no auth */}
      <Route path="/menu-board" element={<MenuBoardScreen />} />

      {/* Customer QR Ordering — public, no auth */}
      <Route path="/order" element={<CustomerOrderScreen />} />

      {/* Public invoice self-service — no auth */}
      <Route path="/invoice/:token" element={<PublicInvoiceScreen />} />

      {/* Fallback route */}
      <Route
        path="*"
        element={
          <Navigate to={currentEmployee ? '/pos' : '/'} replace />
        }
      />
    </Routes>
    <AdminAIFAB />
    <UpgradeCTABar />
    </>
  );
};

/* ==================== Demo Token Handler ==================== */

function useDemoToken() {
  const [showDemoScreen, setShowDemoScreen] = useState(false);
  const [demoReady, setDemoReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demoToken = params.get('demo_token');
    if (!demoToken) return;

    // Strip demo_token from URL immediately
    const url = new URL(window.location.href);
    url.searchParams.delete('demo_token');
    window.history.replaceState({}, '', url.toString());

    setShowDemoScreen(true);

    (async () => {
      try {
        const res = await fetch('/api/auth/demo-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ demo_token: demoToken }),
        });

        if (!res.ok) {
          setShowDemoScreen(false);
          return;
        }

        const data = await res.json();

        // Store tokens for auto-login
        if (data.owner_token) {
          localStorage.setItem('owner_token', data.owner_token);
        }
        if (data.tenant?.id) {
          localStorage.setItem('tenant_id', data.tenant.id);
        }
        if (data.employee) {
          // Store demo employee for auto-login on reload
          localStorage.setItem('demo_employee', JSON.stringify({
            ...data.employee,
            token: data.employee_token,
            permissions: ['pos_access', 'kitchen_access', 'bar_access', 'view_reports', 'manage_menu',
              'manage_inventory', 'manage_employees', 'manage_printers', 'manage_delivery',
              'manage_modifiers', 'manage_ai', 'process_refunds', 'void_orders',
              'apply_discounts', 'view_dashboard', 'manage_permissions', 'manage_purchase_orders',
              'manage_loyalty', 'manage_branding', 'manage_invoicing'],
          }));
        }

        sessionStorage.setItem('is_demo', '1');
        setDemoReady(true);
      } catch {
        setShowDemoScreen(false);
      }
    })();
  }, []);

  const dismissDemoScreen = useCallback(() => {
    setShowDemoScreen(false);
    // Reload so AuthContext picks up the stored demo employee
    window.location.href = window.location.origin + window.location.pathname + '#/pos';
    window.location.reload();
  }, []);

  return { showDemoScreen, demoReady, dismissDemoScreen };
}

/* ==================== App Content ==================== */

const AppContent: React.FC = () => {
  const tenantInfo = useMemo(() => resolveTenant(), []);
  const isPlatformMode = tenantInfo.mode === 'platform' || tenantInfo.mode === 'local';
  const { showDemoScreen, demoReady, dismissDemoScreen } = useDemoToken();

  if (showDemoScreen) {
    return (
      <DemoLoadingScreen
        onReady={dismissDemoScreen}
        onSkip={dismissDemoScreen}
      />
    );
  }

  return (
    <TenantContext.Provider value={tenantInfo}>
      <Router>
        <React.Suspense fallback={<LoadingFallback />}>
          {isPlatformMode ? <PlatformRoutes /> : <TenantRoutes />}
        </React.Suspense>
      </Router>
    </TenantContext.Provider>
  );
};

export default function App() {
  return (
    <BrandingProvider>
      <PlanProvider>
        <ToastProvider>
          <AuthProvider>
            <SyncProvider>
              <AppContent />
            </SyncProvider>
          </AuthProvider>
        </ToastProvider>
      </PlanProvider>
    </BrandingProvider>
  );
}
