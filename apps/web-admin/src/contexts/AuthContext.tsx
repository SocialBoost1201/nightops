'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

interface User {
  accountId: string;
  tenantId: string;
  role: string;
  displayName?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = Cookies.get('accessToken');
      if (token) {
        try {
          // Decode token for initial user info
          const decoded: any = jwtDecode(token);
          setUser({
            accountId: decoded.sub,
            tenantId: decoded.tenantId,
            role: decoded.role,
          });

          // Optional: Fetch full profile from API
          // const res = await apiClient.get('/me');
          // setUser(p => ({ ...p, displayName: res.data.displayName }));
        } catch (error) {
          console.error('Invalid token', error);
          Cookies.remove('accessToken');
          Cookies.remove('refreshToken');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (token: string, refreshToken: string) => {
    Cookies.set('accessToken', token, { secure: true, sameSite: 'strict' });
    Cookies.set('refreshToken', refreshToken, { secure: true, sameSite: 'strict' });
    const decoded: any = jwtDecode(token);
    setUser({
      accountId: decoded.sub,
      tenantId: decoded.tenantId,
      role: decoded.role,
    });
  };

  const logout = () => {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
