import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ClinicSession } from '../types';
import { api, ApiError } from '../services/apiClient';

interface AuthContextValue {
  session: ClinicSession;
  loading: boolean;
  error: string | null;
  refreshSession: () => Promise<void>;
  login: (identifier: string, password: string, clinicId?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchClinic: (clinicId: string) => Promise<void>;
}

const EMPTY_SESSION: ClinicSession = {
  authenticated: false,
  isDevAutoLogin: false,
  user: null,
  activeClinic: null,
  activeRole: null,
  memberships: [],
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<ClinicSession>(EMPTY_SESSION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ClinicSession>('/api/auth/session');
      setSession(data);
    } catch (err: any) {
      setSession(EMPTY_SESSION);
      setError(err instanceof ApiError ? err.message : 'Impossible de vérifier la session.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (identifier: string, password: string, clinicId?: string) => {
    setError(null);
    const data = await api.post<ClinicSession>('/api/auth/login', {
      identifier,
      password,
      clinicId,
    });
    setSession(data);
  };

  const logout = async () => {
    await api.post('/api/auth/logout');
    setSession(EMPTY_SESSION);
  };

  const switchClinic = async (clinicId: string) => {
    const data = await api.post<ClinicSession>('/api/auth/switch-clinic', { clinicId });
    setSession(data);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        error,
        refreshSession,
        login,
        logout,
        switchClinic,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
