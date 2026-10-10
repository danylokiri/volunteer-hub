import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_USER_ID } from '../../domain/seed/mockData';
import { ApiService, LoginBody, RegisterUserBody } from '../../data/api/types';
import { ApiError } from '../../data/api/ApiError';
import { MockApiService } from '../../data/api/MockApiService';

const STORAGE_KEY = 'auth_current_user_id';

export type AuthState = {
  currentUserId: string | null;
  isHydrated: boolean;
  lastError: string | null;
};

export type AuthContextValue = AuthState & {
  loginAsDemoUser: () => Promise<void>;
  loginWithCredentials: (body: LoginBody) => Promise<{ ok: boolean; error?: string }>;
  register: (body: RegisterUserBody) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type ProviderProps = {
  children: React.ReactNode;
  /** Inject an ApiService. Defaults to a singleton MockApiService for tests. */
  apiService?: ApiService;
};

let SHARED_MOCK: MockApiService | null = null;
function defaultApi(): ApiService {
  if (!SHARED_MOCK) SHARED_MOCK = new MockApiService();
  return SHARED_MOCK;
}

export function AuthProvider({ children, apiService }: ProviderProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const apiRef = useRef<ApiService>(apiService ?? defaultApi());

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!alive) return;
        if (value) setCurrentUserId(value);
      })
      .catch(() => {
        // Ignore -- treat as logged-out.
      })
      .finally(() => {
        if (alive) setIsHydrated(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const loginAsDemoUser = useCallback(async () => {
    setCurrentUserId(DEMO_USER_ID);
    setLastError(null);
    await AsyncStorage.setItem(STORAGE_KEY, DEMO_USER_ID);
  }, []);

  const loginWithCredentials = useCallback(
    async (body: LoginBody): Promise<{ ok: boolean; error?: string }> => {
      setLastError(null);
      try {
        const result = await apiRef.current.login(body);
        setCurrentUserId(result.userId);
        await AsyncStorage.setItem(STORAGE_KEY, result.userId);
        return { ok: true };
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.code === 'UNAUTHORIZED'
              ? 'Невірний email або пароль.'
              : err.message
            : 'Не вдалося увійти.';
        setLastError(message);
        return { ok: false, error: message };
      }
    },
    [],
  );

  const register = useCallback(
    async (body: RegisterUserBody): Promise<{ ok: boolean; error?: string }> => {
      setLastError(null);
      try {
        const result = await apiRef.current.register(body);
        setCurrentUserId(result.userId);
        await AsyncStorage.setItem(STORAGE_KEY, result.userId);
        return { ok: true };
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.code === 'CONFLICT'
              ? 'Ця електронна адреса вже зареєстрована.'
              : err.message
            : 'Не вдалося створити акаунт.';
        setLastError(message);
        return { ok: false, error: message };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    setCurrentUserId(null);
    setLastError(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const clearError = useCallback(() => setLastError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUserId,
      isHydrated,
      lastError,
      loginAsDemoUser,
      loginWithCredentials,
      register,
      logout,
      clearError,
    }),
    [
      currentUserId,
      isHydrated,
      lastError,
      loginAsDemoUser,
      loginWithCredentials,
      register,
      logout,
      clearError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
