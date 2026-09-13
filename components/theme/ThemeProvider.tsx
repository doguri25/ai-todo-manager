"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import {
  fetchUserUiPreferences,
  saveUserUiPreferences,
} from "@/lib/ui/preferences-api";
import {
  applyUiPreferencesToDocument,
  DEFAULT_UI_PREFERENCES,
  type UiFontId,
  type UiThemeId,
  type UserUiPreferences,
} from "@/lib/ui/preferences";

type ThemeContextValue = {
  preferences: UserUiPreferences;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  setFont: (font: UiFontId) => Promise<void>;
  setTheme: (theme: UiThemeId) => Promise<void>;
  setPreferences: (next: UserUiPreferences) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
};

/**
 * 사용자별 글꼴·테마를 불러와 적용하고 Supabase에 저장한다.
 */
export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [preferences, setPreferencesState] = useState<UserUiPreferences>(
    DEFAULT_UI_PREFERENCES
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    applyUiPreferencesToDocument(preferences);
  }, [preferences]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (isAuthLoading) return;

      if (!user) {
        if (!cancelled) {
          setPreferencesState(DEFAULT_UI_PREFERENCES);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      const next = await fetchUserUiPreferences(user.id);
      if (!cancelled) {
        setPreferencesState(next);
        setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, isAuthLoading]);

  const persist = useCallback(
    async (next: UserUiPreferences) => {
      setPreferencesState(next);
      applyUiPreferencesToDocument(next);

      if (!user) return;

      setIsSaving(true);
      setError(null);
      const result = await saveUserUiPreferences(user.id, next);
      if (result.error) {
        setError(result.error);
      }
      setIsSaving(false);
    },
    [user]
  );

  const setFont = useCallback(
    async (font: UiFontId) => {
      await persist({ ...preferences, font });
    },
    [persist, preferences]
  );

  const setTheme = useCallback(
    async (theme: UiThemeId) => {
      await persist({ ...preferences, theme });
    },
    [persist, preferences]
  );

  const setPreferences = useCallback(
    async (next: UserUiPreferences) => {
      await persist(next);
    },
    [persist]
  );

  const value = useMemo(
    () => ({
      preferences,
      isLoading,
      isSaving,
      error,
      setFont,
      setTheme,
      setPreferences,
    }),
    [
      preferences,
      isLoading,
      isSaving,
      error,
      setFont,
      setTheme,
      setPreferences,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

/**
 * 테마 컨텍스트를 읽는다.
 */
export const useThemePreferences = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemePreferences는 ThemeProvider 안에서만 사용할 수 있어요.");
  }
  return context;
};
