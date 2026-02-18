import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Employee } from '../types';
import { loginEmployee as loginEmployeeApi, setCurrentEmployeeId } from '../api';

interface AuthContextType {
  currentEmployee: Employee | null;
  permissions: string[];
  isLoading: boolean;
  error: string | null;
  login: (pin: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (pin: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const employee = await loginEmployeeApi(pin);
      setCurrentEmployee(employee);
      setPermissions(employee.permissions || []);
      setCurrentEmployeeId(employee.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentEmployee(null);
    setPermissions([]);
    setCurrentEmployeeId(null);
    setError(null);
  }, []);

  const hasPermission = useCallback((permission: string) => {
    if (!currentEmployee) return false;
    if (currentEmployee.role === 'admin') return true;
    return permissions.includes(permission);
  }, [currentEmployee, permissions]);

  const value: AuthContextType = {
    currentEmployee,
    permissions,
    isLoading,
    error,
    login,
    logout,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
