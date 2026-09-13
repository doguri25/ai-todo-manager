import type { User } from "@supabase/supabase-js";

import type { AuthUserInfo } from "@/lib/auth/types";
import { toAuthUserInfo } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/client";

/**
 * users 테이블의 표시 이름·아바타를 읽어 Auth 표시 정보에 합친다.
 */
export const enrichAuthUserInfo = async (
  user: User
): Promise<AuthUserInfo> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("users")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return toAuthUserInfo(user, {
    displayName: data?.display_name ?? null,
    avatarUrl: data?.avatar_url ?? null,
  });
};
