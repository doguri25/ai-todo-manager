import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Proxy에서 세션을 갱신하고 현재 사용자를 조회한다.
 */
export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // getSession만 쓰면 JWT 검증이 약하므로 getUser로 확인한다.
  // 세션이 없으면 user: null 이며, 일부 환경에서는 error가 함께 올 수 있다.
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({
    data: { user: null },
  }));

  return { user, supabaseResponse };
};
