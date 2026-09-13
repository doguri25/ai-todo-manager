import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseUrl } from "@/lib/supabase/env";

/**
 * 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트를 생성한다.
 */
export const createClient = () => {
  return createBrowserClient(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
};
