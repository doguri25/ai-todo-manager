"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  ImagePlusIcon,
  LogOutIcon,
  PaletteIcon,
  Trash2Icon,
  TypeIcon,
  UserRoundIcon,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useThemePreferences } from "@/components/theme/ThemeProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { UI_FONTS, UI_THEMES } from "@/lib/ui/preferences";
import { cn } from "@/lib/utils";

type SettingsCategory = "profile" | "font" | "theme" | "account";

const SETTINGS_CATEGORIES: {
  id: SettingsCategory;
  label: string;
  icon: typeof UserRoundIcon;
}[] = [
  { id: "profile", label: "프로필", icon: UserRoundIcon },
  { id: "font", label: "글꼴", icon: TypeIcon },
  { id: "theme", label: "테마", icon: PaletteIcon },
  { id: "account", label: "계정", icon: LogOutIcon },
];

type UserSettingsMenuProps = {
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  isLoggingOut?: boolean;
  onLogout: () => void;
};

/**
 * 사용자 이름·아바타를 눌러 카테고리별 설정과 로그아웃을 연다.
 */
export const UserSettingsMenu = ({
  displayName,
  email,
  avatarUrl = null,
  isLoggingOut = false,
  onLogout,
}: UserSettingsMenuProps) => {
  const { updateUserDisplayName, updateUserAvatar, removeUserAvatar } =
    useAuth();
  const { preferences, isSaving, error, setFont, setTheme } =
    useThemePreferences();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<SettingsCategory>("profile");
  const [nameDraft, setNameDraft] = useState(displayName);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);
  const [avatarSaved, setAvatarSaved] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  const initials = displayName.slice(0, 1) || "?";
  const panelError =
    category === "profile"
      ? profileError
      : category === "font" || category === "theme"
        ? error
        : null;

  useEffect(() => {
    setNameDraft(displayName);
  }, [displayName]);

  /**
   * 표시 이름 변경을 저장한다.
   */
  const handleSaveName = async (event?: FormEvent) => {
    event?.preventDefault();
    setProfileError(null);
    setNameSaved(false);
    setIsSavingName(true);
    try {
      const saveError = await updateUserDisplayName(nameDraft);
      if (saveError) {
        setProfileError(saveError);
        return;
      }
      setNameSaved(true);
    } finally {
      setIsSavingName(false);
    }
  };

  /**
   * 선택한 이미지를 프로필 사진으로 저장한다.
   */
  const handleAvatarFile = async (file: File | undefined) => {
    if (!file) return;
    setProfileError(null);
    setAvatarSaved(false);
    setIsSavingAvatar(true);
    try {
      const saveError = await updateUserAvatar(file);
      if (saveError) {
        setProfileError(saveError);
        return;
      }
      setAvatarSaved(true);
    } finally {
      setIsSavingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  /**
   * 프로필 사진을 제거한다.
   */
  const handleRemoveAvatar = async () => {
    setProfileError(null);
    setAvatarSaved(false);
    setIsSavingAvatar(true);
    try {
      const saveError = await removeUserAvatar();
      if (saveError) {
        setProfileError(saveError);
        return;
      }
      setAvatarSaved(true);
    } finally {
      setIsSavingAvatar(false);
    }
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setCategory("profile");
          setNameDraft(displayName);
          setProfileError(null);
          setNameSaved(false);
          setAvatarSaved(false);
        }
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex max-w-[12rem] items-center gap-2 rounded-full outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring sm:max-w-[15rem]"
            aria-label="사용자 설정 열기"
          />
        }
      >
        <span className="hidden min-w-0 truncate text-sm font-medium sm:inline">
          {displayName}
        </span>
        <Avatar size="default" className="shrink-0">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DialogTrigger>

      <DialogContent className="flex h-[min(90dvh,34rem)] w-full flex-col gap-4 overflow-hidden sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>사용자 설정</DialogTitle>
          <DialogDescription>
            카테고리를 골라 프로필·글꼴·테마를 설정해요.
          </DialogDescription>
        </DialogHeader>

        <div
          role="tablist"
          aria-label="설정 카테고리"
          className="grid shrink-0 grid-cols-4 gap-1 rounded-2xl bg-muted p-1"
        >
          {SETTINGS_CATEGORIES.map((item) => {
            const Icon = item.icon;
            const selected = category === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setCategory(item.id)}
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-center transition-colors",
                  selected
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                <span className="max-w-full truncate text-[10px] leading-tight font-medium">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {panelError ? (
          <Alert variant="destructive" className="shrink-0 py-2">
            <AlertDescription>{panelError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          {category === "profile" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/30 px-3 py-2.5">
                <Avatar size="lg" aria-hidden>
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {email}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>프로필 사진</Label>
                <input
                  ref={fileInputRef}
                  id={fileInputId}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  disabled={isSavingAvatar}
                  onChange={(event) => {
                    void handleAvatarFile(event.target.files?.[0]);
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSavingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isSavingAvatar ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <ImagePlusIcon data-icon="inline-start" />
                    )}
                    사진 선택
                  </Button>
                  {avatarUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isSavingAvatar}
                      onClick={() => {
                        void handleRemoveAvatar();
                      }}
                    >
                      <Trash2Icon data-icon="inline-start" />
                      사진 삭제
                    </Button>
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  JPG·PNG·WebP, 5MB 이하. 정사각으로 자동 맞춰 저장돼요.
                </p>
                {avatarSaved ? (
                  <p className="text-xs text-muted-foreground">
                    프로필 사진을 저장했어요.
                  </p>
                ) : null}
              </div>

              <form
                className="space-y-2"
                onSubmit={(event) => void handleSaveName(event)}
              >
                <Label htmlFor="settings-display-name">표시 이름</Label>
                <Input
                  id="settings-display-name"
                  value={nameDraft}
                  maxLength={50}
                  disabled={isSavingName}
                  autoComplete="nickname"
                  onChange={(event) => {
                    setNameDraft(event.target.value);
                    setNameSaved(false);
                    setProfileError(null);
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  {nameSaved ? (
                    <p className="text-xs text-muted-foreground">저장했어요.</p>
                  ) : (
                    <span />
                  )}
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      isSavingName ||
                      nameDraft.trim() === displayName ||
                      !nameDraft.trim()
                    }
                  >
                    {isSavingName ? (
                      <Spinner data-icon="inline-start" />
                    ) : null}
                    이름 저장
                  </Button>
                </div>
              </form>
            </div>
          ) : null}

          {category === "font" ? (
            <div className="space-y-2">
              <Label>글꼴</Label>
              <div className="grid gap-2">
                {UI_FONTS.map((font) => (
                  <button
                    key={font.id}
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      void setFont(font.id);
                    }}
                    className={cn(
                      "rounded-2xl border px-3 py-2.5 text-left transition-colors",
                      preferences.font === font.id
                        ? "border-primary bg-primary/10"
                        : "border-border/70 hover:bg-muted/40"
                    )}
                    style={{ fontFamily: font.cssFamily }}
                  >
                    <p className="text-sm font-medium">{font.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {font.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {category === "theme" ? (
            <div className="space-y-2">
              <Label>테마</Label>
              <div className="grid gap-2">
                {UI_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      void setTheme(theme.id);
                    }}
                    className={cn(
                      "rounded-2xl border px-3 py-2.5 text-left transition-colors",
                      preferences.theme === theme.id
                        ? "border-primary bg-primary/10"
                        : "border-border/70 hover:bg-muted/40"
                    )}
                  >
                    <p className="text-sm font-medium">
                      {theme.label}
                      {theme.recommended ? (
                        <span className="ml-1 text-[10px] text-brand-ai">
                          추천
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {theme.description}
                    </p>
                    <span
                      className="mt-2 flex h-2 overflow-hidden rounded-full"
                      data-theme-preview={theme.id}
                      aria-hidden
                    >
                      <span className="flex-1 bg-[var(--preview-1)]" />
                      <span className="flex-1 bg-[var(--preview-2)]" />
                      <span className="flex-1 bg-[var(--preview-3)]" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {category === "account" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/30 px-3 py-2.5 text-sm">
                <Avatar size="default" aria-hidden>
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {email}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isLoggingOut}
                onClick={onLogout}
              >
                {isLoggingOut ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <LogOutIcon data-icon="inline-start" />
                )}
                {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
