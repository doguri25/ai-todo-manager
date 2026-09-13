import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseUrl } from "@/lib/supabase/env";

/**
 * 서버 컴포넌트·Route Handler용 Supabase 클라이언트를 생성한다.
 */
export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component에서 쿠키 쓰기가 막힌 경우는 무시한다.
            // 세션 갱신은 middleware에서 처리하면 된다.
          }
        },
      },
    }
  );
};
