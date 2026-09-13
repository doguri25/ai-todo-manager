import type { Metadata } from "next";
import { Gaegu, Geist, Geist_Mono, Inter, Nanum_Gothic, Noto_Sans_KR } from "next/font/google";
import type { CSSProperties } from "react";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { APP_INFO } from "@/lib/app/info";
import { cn } from "@/lib/utils";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto",
});

const nanumGothic = Nanum_Gothic({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-nanum",
});

const gaegu = Gaegu({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-gaegu",
});

const SITE_TITLE = "AI 할 일 관리 서비스";
const SITE_DESCRIPTION = "AI가 도와주는 똑똑한 할 일 관리 서비스";

export const metadata: Metadata = {
  metadataBase: new URL(APP_INFO.url),
  title: {
    default: SITE_TITLE,
    template: `%s | ${APP_INFO.name}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: APP_INFO.name,
  authors: [{ name: APP_INFO.author }],
  creator: APP_INFO.author,
  publisher: APP_INFO.organization,
  keywords: [
    "할 일",
    "투두",
    "AI",
    "도구리 태스크",
    "일정 관리",
    "할 일 관리",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: APP_INFO.url,
    siteName: APP_INFO.name,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

/**
 * 앱 전역 레이아웃 — 인증·테마 상태를 하위 트리에 제공한다.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      data-theme="deep-teal"
      data-font="maple"
      className={cn(
        "h-full antialiased",
        geistSans.variable,
        geistMono.variable,
        inter.variable,
        notoSansKr.variable,
        nanumGothic.variable,
        gaegu.variable
      )}
      style={
        {
          "--font-app": '"Maplestory", "Pretendard", sans-serif',
        } as CSSProperties
      }
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
