import type { User } from "@supabase/supabase-js";

/**
 * 헤더·UI에서 쓰는 인증 사용자 표시 정보.
 */
export type AuthUserInfo = {
  id: string;
  email: string;
  displayName: string;
  /** 프로필 사진 URL(또는 data URL). 없으면 null */
  avatarUrl: string | null;
};

/**
 * Supabase User를 앱용 표시 정보로 변환한다.
 */
export const toAuthUserInfo = (
  user: User,
  extras?: { avatarUrl?: string | null; displayName?: string | null }
): AuthUserInfo => {
  const displayName =
    extras?.displayName?.trim() ||
    (user.user_metadata?.display_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "사용자";

  const metaAvatar =
    (user.user_metadata?.avatar_url as string | undefined)?.trim() || null;

  return {
    id: user.id,
    email: user.email ?? "",
    displayName,
    avatarUrl: extras?.avatarUrl?.trim() || metaAvatar,
  };
};
