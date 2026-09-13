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
import { usePathname, useRouter } from "next/navigation";

import { enrichAuthUserInfo } from "@/lib/auth/enrich-user";
import { toAuthErrorMessage } from "@/lib/auth/messages";
import { signOutUser } from "@/lib/auth/sign-out";
import type { AuthUserInfo } from "@/lib/auth/types";
import {
  removeAvatarImage,
  updateAvatarImage,
} from "@/lib/auth/update-avatar";
import { updateDisplayName } from "@/lib/auth/update-display-name";
import { createClient } from "@/lib/supabase/client";

type AuthContextValue = {
  user: AuthUserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLoggingOut: boolean;
  logoutError: string | null;
  signOut: () => Promise<boolean>;
  updateUserDisplayName: (displayName: string) => Promise<string | null>;
  updateUserAvatar: (file: File) => Promise<string | null>;
  removeUserAvatar: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

/**
 * Supabase 인증 상태를 전역으로 제공하고 라우트 가드를 수행한다.
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    let syncToken = 0;

    /**
     * 세션 사용자를 프로필(아바타 포함)과 함께 반영한다.
     */
    const applySessionUser = async (
      sessionUser: Parameters<typeof enrichAuthUserInfo>[0] | null | undefined
    ) => {
      const token = ++syncToken;
      if (!sessionUser) {
        if (mounted) setUser(null);
        return;
      }
      try {
        const enriched = await enrichAuthUserInfo(sessionUser);
        if (mounted && token === syncToken) {
          setUser(enriched);
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("[AuthProvider] enrich", error);
        }
        if (mounted && token === syncToken) {
          setUser({
            id: sessionUser.id,
            email: sessionUser.email ?? "",
            displayName:
              (sessionUser.user_metadata?.display_name as string | undefined)?.trim() ||
              sessionUser.email?.split("@")[0] ||
              "사용자",
            avatarUrl: null,
          });
        }
      }
    };

    /**
     * 현재 세션을 읽어 인증 상태를 동기화한다.
     */
    const syncSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          if (process.env.NODE_ENV === "development") {
            console.error("[AuthProvider] getSession", error);
          }
          setUser(null);
          return;
        }

        await applySessionUser(session?.user ?? null);
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("[AuthProvider] syncSession", error);
        }
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      void applySessionUser(session?.user ?? null).finally(() => {
        if (mounted) setIsLoading(false);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * 로그인/비로그인에 따라 / 와 auth 페이지를 서로 리다이렉트한다.
   */
  useEffect(() => {
    if (isLoading) return;

    const isAuthPage = pathname === "/login" || pathname === "/signup";

    if (!user && pathname === "/") {
      router.replace("/login");
      return;
    }

    if (user && isAuthPage) {
      router.replace("/");
    }
  }, [isLoading, user, pathname, router]);

  /**
   * 세션을 즉시 해제한 뒤 로그인 페이지로 이동한다.
   */
  const signOut = useCallback(async () => {
    setLogoutError(null);
    setIsLoggingOut(true);
    try {
      const { error } = await signOutUser();
      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("[AuthProvider] signOut", error);
        }
        setLogoutError(
          toAuthErrorMessage(
            error,
            "로그아웃에 실패했어요. 잠시 후 다시 시도해 주세요."
          )
        );
        return false;
      }

      setUser(null);
      router.replace("/login");
      router.refresh();
      return true;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[AuthProvider] signOut", error);
      }
      setLogoutError("로그아웃에 실패했어요. 잠시 후 다시 시도해 주세요.");
      return false;
    } finally {
      setIsLoggingOut(false);
    }
  }, [router]);

  /**
   * 표시 이름을 저장하고 전역 사용자 상태를 갱신한다.
   */
  const updateUserDisplayName = useCallback(async (displayName: string) => {
    const result = await updateDisplayName(displayName);
    if (result.error || !result.user) {
      return result.error ?? "이름을 저장하지 못했어요.";
    }
    setUser(result.user);
    return null;
  }, []);

  /**
   * 프로필 사진을 저장하고 전역 사용자 상태를 갱신한다.
   */
  const updateUserAvatar = useCallback(async (file: File) => {
    const result = await updateAvatarImage(file);
    if (result.error || !result.user) {
      return result.error ?? "프로필 사진을 저장하지 못했어요.";
    }
    setUser(result.user);
    return null;
  }, []);

  /**
   * 프로필 사진을 제거하고 전역 사용자 상태를 갱신한다.
   */
  const removeUserAvatar = useCallback(async () => {
    const result = await removeAvatarImage();
    if (result.error || !result.user) {
      return result.error ?? "프로필 사진을 삭제하지 못했어요.";
    }
    setUser(result.user);
    return null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user != null,
      isLoggingOut,
      logoutError,
      signOut,
      updateUserDisplayName,
      updateUserAvatar,
      removeUserAvatar,
    }),
    [
      user,
      isLoading,
      isLoggingOut,
      logoutError,
      signOut,
      updateUserDisplayName,
      updateUserAvatar,
      removeUserAvatar,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * AuthProvider 컨텍스트를 조회한다.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth는 AuthProvider 안에서만 사용할 수 있어요.");
  }
  return context;
};
