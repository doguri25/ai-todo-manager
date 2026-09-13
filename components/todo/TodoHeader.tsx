"use client";

import { ListTodoIcon, LogOutIcon, MailIcon } from "lucide-react";

import { HeaderClockWeather } from "@/components/todo/HeaderClockWeather";
import { UserSettingsMenu } from "@/components/theme/UserSettingsMenu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { APP_INFO } from "@/lib/app/info";

type TodoHeaderProps = {
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  isAuthenticated: boolean;
  isLoggingOut?: boolean;
  logoutError?: string | null;
  scheduledDates?: Date[];
  onLogout: () => void;
};

/**
 * 로고·날씨/날짜/시간·사용자(설정)·로그아웃을 고정 높이 헤더로 표시한다.
 */
export const TodoHeader = ({
  displayName,
  email,
  avatarUrl = null,
  isAuthenticated,
  isLoggingOut = false,
  logoutError = null,
  scheduledDates = [],
  onLogout,
}: TodoHeaderProps) => {
  return (
    <header className="relative z-30 h-16 shrink-0 border-b border-border/80 bg-card/80 backdrop-blur-sm">
      <div className="mx-auto grid h-full w-full max-w-[1400px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Dialog>
          <DialogTrigger
            render={
              <button
                type="button"
                className="flex min-w-0 items-center gap-2 rounded-2xl text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-3"
                aria-label="앱 정보 보기"
              />
            }
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ListTodoIcon className="size-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight sm:text-base">
                {APP_INFO.name}
              </p>
              <p className="hidden truncate text-xs text-muted-foreground lg:block">
                {APP_INFO.tagline}
              </p>
            </div>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md duration-200 data-open:zoom-in-95 data-closed:zoom-out-95">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <ListTodoIcon className="size-4" aria-hidden />
                </span>
                {APP_INFO.name}
              </DialogTitle>
              <DialogDescription>
                자연어로 할 일을 만들고 AI로 요약하는 개인용 할 일 관리
                서비스예요.
              </DialogDescription>
            </DialogHeader>

            <dl className="space-y-3 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
              <div className="flex gap-3">
                <dt className="w-14 shrink-0 text-muted-foreground">만든이</dt>
                <dd className="font-medium">{APP_INFO.author}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-14 shrink-0 text-muted-foreground">소속</dt>
                <dd className="font-medium">{APP_INFO.organization}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-14 shrink-0 text-muted-foreground">연락처</dt>
                <dd>
                  <a
                    href={`mailto:${APP_INFO.contact}`}
                    className="inline-flex items-center gap-1.5 font-medium text-brand-ai hover:underline"
                  >
                    <MailIcon className="size-3.5" aria-hidden />
                    {APP_INFO.contact}
                  </a>
                </dd>
              </div>
            </dl>

            <p className="text-center text-xs text-muted-foreground">
              버전 v{APP_INFO.version}
            </p>
          </DialogContent>
        </Dialog>

        <div className="min-w-0 justify-self-center">
          <HeaderClockWeather scheduledDates={scheduledDates} />
        </div>

        <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
          {isAuthenticated ? (
            <>
              <UserSettingsMenu
                displayName={displayName}
                email={email}
                avatarUrl={avatarUrl}
                isLoggingOut={isLoggingOut}
                onLogout={onLogout}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-2xl"
                disabled={isLoggingOut}
                onClick={onLogout}
                aria-label="로그아웃"
              >
                {isLoggingOut ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <LogOutIcon data-icon="inline-start" />
                )}
                <span className="hidden sm:inline">
                  {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
                </span>
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {logoutError ? (
        <div className="pointer-events-none absolute inset-x-0 top-full z-40 px-4 sm:px-6">
          <Alert
            variant="destructive"
            className="pointer-events-auto mx-auto mt-2 max-w-[1400px] py-2 shadow-md"
          >
            <AlertDescription>{logoutError}</AlertDescription>
          </Alert>
        </div>
      ) : null}
    </header>
  );
};
