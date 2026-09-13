/**
 * UI 글꼴·테마 프리셋 정의 (사용자별 Supabase 저장).
 */

export const UI_FONTS = [
  {
    id: "maple",
    label: "메이플스토리",
    description: "게임에 친숙한 둥근 글꼴",
    cssFamily: '"Maplestory", "Pretendard", sans-serif',
  },
  {
    id: "pretendard",
    label: "Pretendard",
    description: "가독성 좋은 본문용 산세리프",
    cssFamily: '"Pretendard", "Noto Sans KR", sans-serif',
  },
  {
    id: "noto",
    label: "Noto Sans KR",
    description: "깔끔한 기본 한글 글꼴",
    cssFamily: 'var(--font-noto), "Noto Sans KR", sans-serif',
  },
  {
    id: "nanum",
    label: "나눔고딕",
    description: "익숙한 나눔 계열",
    cssFamily: 'var(--font-nanum), "Nanum Gothic", sans-serif',
  },
  {
    id: "gaegu",
    label: "개구",
    description: "손글씨 느낌의 포인트 글꼴",
    cssFamily: 'var(--font-gaegu), "Gaegu", cursive',
  },
  {
    id: "geist",
    label: "Geist / Inter",
    description: "초기 추천 UI의 기본 글꼴",
    cssFamily: 'var(--font-geist-sans), var(--font-sans), sans-serif',
  },
] as const;

export type UiFontId = (typeof UI_FONTS)[number]["id"];

export const UI_THEMES = [
  {
    id: "deep-teal",
    label: "딥 틸 (추천)",
    description: "처음 드린 Soft Mist + Deep Teal 브랜드",
    recommended: true,
  },
  {
    id: "slate-ocean",
    label: "슬레이트 오션",
    description: "차가운 회청 톤의 정돈된 화면",
    recommended: false,
  },
  {
    id: "moss-garden",
    label: "모스 가든",
    description: "이끼 그린 계열의 차분한 분위기",
    recommended: false,
  },
  {
    id: "coral-ink",
    label: "코랄 잉크",
    description: "선명한 코랄 포인트와 잉크 텍스트",
    recommended: false,
  },
  {
    id: "midnight",
    label: "미드나잇",
    description: "어두운 배경의 집중 모드",
    recommended: false,
  },
] as const;

export type UiThemeId = (typeof UI_THEMES)[number]["id"];

export type UserUiPreferences = {
  font: UiFontId;
  theme: UiThemeId;
};

export const DEFAULT_UI_PREFERENCES: UserUiPreferences = {
  font: "maple",
  theme: "deep-teal",
};

/**
 * 저장값을 안전한 프리셋 ID로 정규화한다.
 */
export const normalizeUiPreferences = (
  input: Partial<{ font: string; theme: string }> | null | undefined
): UserUiPreferences => {
  const font = UI_FONTS.some((item) => item.id === input?.font)
    ? (input!.font as UiFontId)
    : DEFAULT_UI_PREFERENCES.font;
  const theme = UI_THEMES.some((item) => item.id === input?.theme)
    ? (input!.theme as UiThemeId)
    : DEFAULT_UI_PREFERENCES.theme;
  return { font, theme };
};

/**
 * html 요소에 글꼴·테마 속성을 적용한다.
 */
export const applyUiPreferencesToDocument = (
  preferences: UserUiPreferences
) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.font = preferences.font;
  root.dataset.theme = preferences.theme;
  root.classList.toggle("dark", preferences.theme === "midnight");

  const font = UI_FONTS.find((item) => item.id === preferences.font);
  if (font) {
    root.style.setProperty("--font-app", font.cssFamily);
  }
};
