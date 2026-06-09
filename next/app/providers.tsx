'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_PATHS = ['/auth', '/login', '/register'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const hydrate = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = (await res.json()) as { user: { id: string; email: string; displayName: string; role: string } };
        setUser({
          id: data.user.id,
          email: data.user.email,
          name: data.user.displayName,
          role: data.user.role,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  function getCsrfHeader(): Record<string, string> {
    const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
    return match ? { 'x-csrf-token': match[1] } : {};
  }

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getCsrfHeader() },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || 'Login failed');
      }
      await hydrate();
    },
    [hydrate]
  );

  const register = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getCsrfHeader() },
        credentials: 'include',
        body: JSON.stringify({ email, password, displayName }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || 'Registration failed');
      }
      await hydrate();
    },
    [hydrate]
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getCsrfHeader(),
        credentials: 'include',
      });
    } catch {
      // Ignore errors during logout
    } finally {
      setUser(null);
      router.push('/auth/login');
    }
  }, [router]);

  // Redirect unauthenticated users away from protected routes
  useEffect(() => {
    if (!isLoading && !user && (pathname ? !isPublicPath(pathname) : true)) {
      router.push('/auth/login');
    }
  }, [isLoading, user, pathname, router]);

  // Redirect authenticated users away from auth pages
  useEffect(() => {
    if (!isLoading && user && pathname && isPublicPath(pathname)) {
      router.push('/');
    }
  }, [isLoading, user, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}