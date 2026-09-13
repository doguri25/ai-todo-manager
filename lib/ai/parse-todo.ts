import { z } from "zod";

import type {
  TodoCategory,
  TodoFormValues,
  TodoPriority,
} from "@/lib/todos/types";

const MIN_INPUT_LENGTH = 2;
const MAX_INPUT_LENGTH = 500;
const MIN_TITLE_LENGTH = 2;
const MAX_TITLE_LENGTH = 200;

/**
 * Gemini가 반환하는 구조화 할 일 초안 스키마.
 */
export const aiTodoRawSchema = z.object({
  title: z.string().min(1).max(200).describe("할 일 제목"),
  description: z
    .string()
    .max(2000)
    .nullable()
    .describe("할 일 설명. 없으면 null"),
  due_date: z
    .string()
    .nullable()
    .describe("마감 날짜 YYYY-MM-DD. 미정이면 null"),
  due_time: z
    .string()
    .nullable()
    .describe("마감 시각 HH:mm(24시간). 없으면 null"),
  priority: z.enum(["high", "medium", "low"]).describe("우선순위"),
  category: z
    .enum(["업무", "개인", "건강", "학습", "기타"])
    .describe("카테고리"),
});

export type AiTodoRaw = z.infer<typeof aiTodoRawSchema>;

export const parseTodoRequestSchema = z.object({
  text: z.string(),
  timezone: z.string().min(1).default("Asia/Seoul"),
});

export type ParseTodoValidationResult =
  | { ok: true; text: string; timezone: string }
  | { ok: false; error: string };

type RelativeDateHints = {
  today: string;
  tomorrow: string;
  dayAfterTomorrow: string;
  nearestFriday: string;
  nextMonday: string;
  weekday: string;
};

/**
 * 타임존 기준 오늘 날짜(YYYY-MM-DD)를 반환한다.
 */
export const getDateInTimeZone = (date: Date, timeZone: string): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

/**
 * YYYY-MM-DD에 일수를 더한다.
 */
export const addDaysToDateString = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
};

/**
 * 프롬프트에 넣을 상대 날짜 힌트를 계산한다.
 */
export const buildRelativeDateHints = (
  now: Date,
  timeZone: string
): RelativeDateHints => {
  const today = getDateInTimeZone(now, timeZone);
  const weekdayName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(now);
  const weekdayIndex: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const current = weekdayIndex[weekdayName] ?? 0;

  const daysUntilFriday = (5 - current + 7) % 7;
  const nearestFriday = addDaysToDateString(today, daysUntilFriday);

  const daysSinceMonday = (current + 6) % 7;
  const thisWeekMonday = addDaysToDateString(today, -daysSinceMonday);
  const nextMonday = addDaysToDateString(thisWeekMonday, 7);

  const weekdayKo = ["일", "월", "화", "수", "목", "금", "토"][current] ?? "";

  return {
    today,
    tomorrow: addDaysToDateString(today, 1),
    dayAfterTomorrow: addDaysToDateString(today, 2),
    nearestFriday,
    nextMonday,
    weekday: weekdayKo,
  };
};

/**
 * AI 시스템 프롬프트를 생성한다.
 */
export const buildParseTodoSystemPrompt = (
  timezone: string,
  hints: RelativeDateHints
): string => `당신은 한국어 할 일 관리 앱의 파서입니다.
사용자 자연어를 아래 JSON 스키마에 맞는 객체로만 변환하세요.
설명 문장, 마크다운, 코드블록 없이 스키마 필드만 채웁니다.

[현재 기준]
- 타임존: ${timezone}
- 오늘(${hints.weekday}): ${hints.today}
- 내일: ${hints.tomorrow}
- 모레: ${hints.dayAfterTomorrow}
- 이번 주 금요일(가장 가까운 금요일): ${hints.nearestFriday}
- 다음 주 월요일: ${hints.nextMonday}

[날짜 처리 규칙 — 반드시 준수]
- "오늘" → due_date = ${hints.today}
- "내일" → due_date = ${hints.tomorrow}
- "모레" → due_date = ${hints.dayAfterTomorrow}
- "이번 주 금요일" → due_date = ${hints.nearestFriday} (가장 가까운 금요일, 오늘이 금요일이면 오늘)
- "다음 주 월요일" → due_date = ${hints.nextMonday}
- 마감 언급이 없으면 due_date = null, due_time = null (미정)
- due_date 형식은 반드시 YYYY-MM-DD

[시간 처리 규칙 — 반드시 준수]
- "아침" → due_time = "09:00"
- "점심" → due_time = "12:00"
- "오후" → due_time = "14:00" (단, "오후 N시"처럼 구체 시각이 있으면 그 시각 사용)
- "저녁" → due_time = "18:00"
- "밤" → due_time = "21:00"
- "오전 N시/오후 N시/N시"처럼 구체 시각이 있으면 24시간제 HH:mm으로 변환
- 날짜만 있고 시간이 없으면 due_time = null (서버가 00:00 시간 미정으로 저장)
- due_time 형식은 반드시 HH:mm

[우선순위 키워드 — 반드시 준수]
- high: "급하게", "중요한", "빨리", "꼭", "반드시" 가 포함되면 high
- medium: "보통", "적당히" 이거나 우선순위 키워드가 없으면 medium
- low: "여유롭게", "천천히", "언젠가" 가 포함되면 low
- 충돌 시 high > medium > low 순으로 높은 쪽을 선택

[카테고리 분류 키워드 — 반드시 준수]
- 업무: "회의", "보고서", "보고", "프로젝트", "업무"
- 개인: "쇼핑", "친구", "가족", "개인"
- 건강: "운동", "병원", "건강", "요가"
- 학습: "공부", "책", "강의", "학습"
- 위 키워드가 없으면 "기타"
- 여러 카테고리 키워드가 있으면 문장 핵심 행위 기준 1개만 선택

[출력 형식 — 반드시 준수]
- JSON 스키마 필드를 정확히 채운다: title, description, due_date, due_time, priority, category
- title은 짧고 명확한 동작 중심
- description은 원문 맥락을 한 문장으로 보강. 없으면 null
- completed 필드는 출력하지 않는다
- 지정된 enum/형식 외 값은 절대 사용하지 않는다`;

/**
 * 앞뒤 공백 제거, 연속 공백 통합, 영문 소문자화, 제어문자·이모지 정리.
 */
export const preprocessInputText = (raw: string): string => {
  const withoutControls = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  // 이모지 및 대부분의 심볼 픽토그래프 제거 (한글·영문·숫자·기본 문장부호는 유지)
  const withoutEmoji = withoutControls.replace(
    /\p{Extended_Pictographic}|\p{Emoji_Presentation}|[\uFE0F\u200D]/gu,
    ""
  );
  const collapsed = withoutEmoji.replace(/\s+/g, " ").trim();
  // 영문만 소문자로 정규화 (한글은 그대로)
  return collapsed.replace(/[A-Z]/g, (ch) => ch.toLowerCase());
};

/**
 * 의미 있는 문자(한글·영문·숫자)가 하나라도 있는지 확인한다.
 */
export const hasMeaningfulCharacters = (text: string): boolean =>
  /[0-9A-Za-z\uAC00-\uD7A3]/.test(text);

/**
 * 요청 본문을 전처리·검증한다.
 */
export const validateAndNormalizeInput = (body: unknown): ParseTodoValidationResult => {
  const parsed = parseTodoRequestSchema.safeParse({
    timezone: "Asia/Seoul",
    ...(body && typeof body === "object" ? body : {}),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "요청 형식이 올바르지 않아요. 문장을 다시 확인해 주세요.",
    };
  }

  const timezone = parsed.data.timezone || "Asia/Seoul";
  const rawText =
    typeof (body as { text?: unknown })?.text === "string"
      ? (body as { text: string }).text
      : parsed.data.text;

  if (typeof rawText !== "string" || rawText.trim().length === 0) {
    return {
      ok: false,
      error: "할 일 내용을 입력해 주세요.",
    };
  }

  if (rawText.length > MAX_INPUT_LENGTH) {
    return {
      ok: false,
      error: `입력은 최대 ${MAX_INPUT_LENGTH}자까지 가능해요.`,
    };
  }

  const text = preprocessInputText(rawText);

  if (!text) {
    return {
      ok: false,
      error:
        "이모지나 특수 문자만으로는 할 일을 만들 수 없어요. 글자를 포함해 주세요.",
    };
  }

  if (text.length < MIN_INPUT_LENGTH) {
    return {
      ok: false,
      error: `내용을 최소 ${MIN_INPUT_LENGTH}자 이상 입력해 주세요.`,
    };
  }

  if (text.length > MAX_INPUT_LENGTH) {
    return {
      ok: false,
      error: `입력은 최대 ${MAX_INPUT_LENGTH}자까지 가능해요.`,
    };
  }

  if (!hasMeaningfulCharacters(text)) {
    return {
      ok: false,
      error:
        "특수 문자만으로는 할 일을 만들 수 없어요. 한글이나 영문, 숫자를 포함해 주세요.",
    };
  }

  return { ok: true, text, timezone };
};

/**
 * 날짜·시각을 ISO(timestamptz)로 합친다. 시각이 없으면 00:00(시간 미정)으로 둔다.
 */
export const combineDueDateTime = (
  dueDate: string | null | undefined,
  dueTime: string | null | undefined,
  timezone = "Asia/Seoul"
): string | null => {
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return null;
  }

  const time =
    dueTime && /^\d{2}:\d{2}$/.test(dueTime) ? dueTime : "00:00";

  const offset = timezone === "Asia/Seoul" ? "+09:00" : "+09:00";
  const iso = `${dueDate}T${time}:00${offset}`;
  const parsed = new Date(iso);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const PRIORITIES: TodoPriority[] = ["high", "medium", "low"];
const CATEGORIES: TodoCategory[] = ["업무", "개인", "건강", "학습", "기타"];

/**
 * 제목 길이를 스키마 범위에 맞게 자동 조정한다.
 */
export const normalizeTitle = (
  title: string | null | undefined,
  fallbackSource?: string | null
): string => {
  let next = (title ?? "").replace(/\s+/g, " ").trim();

  if (next.length < MIN_TITLE_LENGTH) {
    const fromFallback = (fallbackSource ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_TITLE_LENGTH);
    next =
      fromFallback.length >= MIN_TITLE_LENGTH ? fromFallback : "새 할 일";
  }

  if (next.length > MAX_TITLE_LENGTH) {
    next = `${next.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`;
  }

  return next;
};

/**
 * AI 결과를 후처리해 TodoFormValues로 만든다.
 */
export const postprocessAiTodo = (
  raw: Partial<AiTodoRaw> | null | undefined,
  timezone: string,
  now: Date = new Date()
): TodoFormValues => {
  const priority = PRIORITIES.includes(raw?.priority as TodoPriority)
    ? (raw!.priority as TodoPriority)
    : "medium";

  const category = CATEGORIES.includes(raw?.category as TodoCategory)
    ? (raw!.category as TodoCategory)
    : "기타";

  const description = (raw?.description ?? "").trim();
  const title = normalizeTitle(raw?.title, description || undefined);

  let dueDate = combineDueDateTime(raw?.due_date, raw?.due_time, timezone);

  // 과거 마감이면 미정(null)으로 보정한다. 시간 미정은 날짜만 비교한다.
  if (dueDate) {
    const due = new Date(dueDate);
    const dueLocal = getDateInTimeZone(due, timezone);
    const todayLocal = getDateInTimeZone(now, timezone);
    const timeUnset = !raw?.due_time || !/^\d{2}:\d{2}$/.test(raw.due_time);

    if (timeUnset) {
      if (dueLocal < todayLocal) dueDate = null;
    } else if (due.getTime() < now.getTime()) {
      dueDate = null;
    }
  }

  return {
    title,
    description: description.slice(0, 2000),
    due_date: dueDate,
    priority,
    category,
    completed: false,
  };
};
