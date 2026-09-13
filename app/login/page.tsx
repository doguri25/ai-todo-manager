import type { Metadata } from "next";
import { ListTodoIcon } from "lucide-react";

import { LoginForm } from "@/components/auth/LoginForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "로그인 | AI Todo Manager",
  description: "이메일과 비밀번호로 AI Todo Manager에 로그인합니다.",
};

/**
 * 이메일/비밀번호 로그인 화면을 구성한다.
 */
const LoginPage = () => {
  return (
    <main className="relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.953_0.050_180.8)_0%,_transparent_55%),linear-gradient(180deg,_var(--background)_0%,_oklch(0.960_0.010_186)_100%)]"
      />

      <div className="relative z-10 flex w-full max-w-md flex-col gap-8">
        <header className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <ListTodoIcon className="size-7" aria-hidden />
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              AI Todo Manager
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
              자연어로 할 일을 만들고, 검색·필터로 정리하며, AI 요약으로 하루와
              한 주를 파악하세요.
            </p>
          </div>
        </header>

        <Card size="sm" className="shadow-md">
          <CardHeader>
            <CardTitle>로그인</CardTitle>
            <CardDescription>
              이메일과 비밀번호로 계정에 로그인하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default LoginPage;
