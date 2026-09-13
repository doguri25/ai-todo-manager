import { createClient } from "@/lib/supabase/client";

/**
 * 현재 세션을 종료하고 Supabase Auth에서 로그아웃한다.
 */
export const signOutUser = async () => {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  return { error };
};
