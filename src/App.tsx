import React from 'react';
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';

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

const AIConfigScreen = React.lazy(() =>
  import('./screens/AIConfigScreen').then((module) => ({
    default: module.default || (() => <div>AI Config</div>),
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
      <div className="text-2xl text-red-600 font-bold animate-pulse">{t('states.loading')}</div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { currentEmployee } = useAuth();

  return (
    <Router>
      <React.Suspense fallback={<LoadingFallback />}>
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

        {/* Fallback route */}
        <Route
          path="*"
          element={
            <Navigate to={currentEmployee ? '/pos' : '/'} replace />
          }
        />
      </Routes>
      </React.Suspense>
    </Router>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <AppContent />
      </SyncProvider>
    </AuthProvider>
  );
}
