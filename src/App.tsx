import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

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

const AppContent: React.FC = () => {
  const { currentEmployee } = useAuth();

  return (
    <Router>
      <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100"><div className="text-2xl text-orange-600 font-bold animate-pulse">Loading...</div></div>}>
      <Routes>
        {/* Login Route - accessible to everyone */}
        <Route path="/" element={<LoginScreen />} />

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
              requiredRole={['kitchen', 'manager', 'admin']}
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
      <AppContent />
    </AuthProvider>
  );
}
