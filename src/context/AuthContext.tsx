import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Employee } from '../types';
import { loginEmployee as loginEmployeeApi } from '../api';

interface AuthContextType {
  currentEmployee: Employee | null;
  isLoading: boolean;
  error: string | null;
  login: (pin: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (pin: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const employee = await loginEmployeeApi(pin);
      setCurrentEmployee(employee);
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
    setError(null);
  }, []);

  const value: AuthContextType = {
    currentEmployee,
    isLoading,
    error,
    login,
    logout,
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
