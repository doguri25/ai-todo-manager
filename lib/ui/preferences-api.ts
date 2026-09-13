import { createClient } from "@/lib/supabase/client";
import {
  normalizeUiPreferences,
  type UserUiPreferences,
} from "@/lib/ui/preferences";

/**
 * 사용자의 UI 글꼴·테마 설정을 불러온다.
 */
export const fetchUserUiPreferences = async (
  userId: string
): Promise<UserUiPreferences> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select("ui_font, ui_theme")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[fetchUserUiPreferences]", error);
    }
    return normalizeUiPreferences(null);
  }

  return normalizeUiPreferences({
    font: data?.ui_font ?? undefined,
    theme: data?.ui_theme ?? undefined,
  });
};

/**
 * 사용자의 UI 글꼴·테마 설정을 저장한다.
 */
export const saveUserUiPreferences = async (
  userId: string,
  preferences: UserUiPreferences
): Promise<{ error: string | null }> => {
  const supabase = createClient();
  const { error } = await supabase
    .from("users")
    .update({
      ui_font: preferences.font,
      ui_theme: preferences.theme,
    })
    .eq("id", userId);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[saveUserUiPreferences]", error);
    }
    return {
      error: "설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  return { error: null };
};
