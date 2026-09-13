import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * 인증 상태에 따라 보호/공개 라우트를 리다이렉트한다.
 */
export const proxy = async (request: NextRequest) => {
  const { user, supabaseResponse } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isProtectedHome = pathname === "/";

  if (!user && isProtectedHome) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
};

export const config = {
  matcher: [
    /*
     * 정적 자산·이미지·favicon을 제외한 페이지 요청에만 적용한다.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
