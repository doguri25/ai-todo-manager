import { toAuthErrorMessage } from "@/lib/auth/messages";
import { enrichAuthUserInfo } from "@/lib/auth/enrich-user";
import type { AuthUserInfo } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/client";
import { toTodoErrorMessage } from "@/lib/todos/api";

export type UpdateDisplayNameResult = {
  user: AuthUserInfo | null;
  error: string | null;
};

/**
 * 표시 이름을 Auth 메타데이터와 users 테이블에 함께 갱신한다.
 */
export const updateDisplayName = async (
  displayName: string
): Promise<UpdateDisplayNameResult> => {
  const trimmed = displayName.trim();

  if (!trimmed) {
    return { user: null, error: "이름을 입력해 주세요." };
  }
  if (trimmed.length > 50) {
    return { user: null, error: "이름은 50자 이하로 입력해 주세요." };
  }

  const supabase = createClient();
  const {
    data: { user: currentUser },
    error: currentError,
  } = await supabase.auth.getUser();

  if (currentError || !currentUser) {
    return {
      user: null,
      error: toAuthErrorMessage(
        currentError,
        "로그인이 만료되었어요. 다시 로그인해 주세요."
      ),
    };
  }

  const { data: authData, error: authError } = await supabase.auth.updateUser({
    data: { display_name: trimmed },
  });

  if (authError || !authData.user) {
    return {
      user: null,
      error: toAuthErrorMessage(
        authError,
        "이름을 저장하지 못했어요. 잠시 후 다시 시도해 주세요."
      ),
    };
  }

  const { error: profileError } = await supabase
    .from("users")
    .update({ display_name: trimmed })
    .eq("id", currentUser.id);

  if (profileError) {
    if (process.env.NODE_ENV === "development") {
      console.error("[updateDisplayName] profile", profileError);
    }
    return {
      user: null,
      error: toTodoErrorMessage(
        profileError,
        "이름을 저장하지 못했어요. 잠시 후 다시 시도해 주세요."
      ),
    };
  }

  return { user: await enrichAuthUserInfo(authData.user), error: null };
};
