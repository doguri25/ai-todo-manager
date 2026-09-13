import { z } from "zod";

import { getDateInTimeZone, addDaysToDateString } from "@/lib/ai/parse-todo";
import type { Todo, TodoCategory, TodoPriority } from "@/lib/todos/types";
import { TODO_CATEGORIES, TODO_PRIORITIES } from "@/lib/todos/types";

export const SUMMARIZE_PERIODS = ["today", "week"] as const;
export type SummarizePeriod = (typeof SUMMARIZE_PERIODS)[number];

export const summarizeRequestSchema = z.object({
  period: z.enum(SUMMARIZE_PERIODS),
  timezone: z.string().min(1).default("Asia/Seoul"),
});

/**
 * Gemini가 반환하는 요약·인사이트 스키마.
 */
export const aiSummarySchema = z.object({
  summary: z
    .string()
    .min(1)
    .max(500)
    .describe("완료율·개선도를 포함한 한두 문장 요약"),
  urgentTasks: z
    .array(z.string().min(1).max(200))
    .max(10)
    .describe("긴급·임박·지연 할 일 제목. 없으면 빈 배열"),
  strengths: z
    .array(z.string().min(1).max(300))
    .min(1)
    .max(4)
    .describe("잘하고 있는 점과 짧은 동기부여 메시지"),
  insights: z
    .array(z.string().min(1).max(300))
    .min(2)
    .max(8)
    .describe("완료율·시간관리·생산성 패턴 인사이트"),
  recommendations: z
    .array(z.string().min(1).max(300))
    .min(2)
    .max(6)
    .describe("바로 실천 가능한 시간관리·우선순위·분산 전략"),
  nextWeekPlan: z
    .array(z.string().min(1).max(300))
    .max(5)
    .describe(
      "다음 주 계획 제안. 이번 주 요약에서 2–5개, 오늘의 요약이면 빈 배열"
    ),
});

export type AiSummary = z.infer<typeof aiSummarySchema>;

export type RemainingTodoItem = {
  id: string;
  title: string;
  priority: TodoPriority;
  due_date: string | null;
};

export type DailyTrendPoint = {
  date: string;
  weekday: string;
  total: number;
  completed: number;
  rate: number;
};

export type TrendComparisonPoint = {
  label: string;
  rate: number;
};

export type TimeFocusBucket = {
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
  unset: number;
};

export type PriorityBreakdown = {
  total: number;
  completed: number;
  remaining: number;
  completionRate: number;
};

export type PeriodSnapshot = {
  label: string;
  startDate: string;
  endDate: string;
  total: number;
  completed: number;
  completionRate: number;
};

export type SummarizeStats = {
  total: number;
  completed: number;
  remaining: number;
  overdue: number;
  completionRate: number;
  /** 이전 기간 대비 완료율 변화(퍼센트포인트). 비교 불가 시 null */
  completionRateDelta: number | null;
  deadlineComplianceRate: number;
  deferredCount: number;
  priority: Record<TodoPriority, number>;
  priorityCompletion: Record<TodoPriority, PriorityBreakdown>;
  remainingByPriority: Record<TodoPriority, number>;
  deferredByCategory: Record<TodoCategory, number>;
  deferredByPriority: Record<TodoPriority, number>;
  /** 마감 예정 시각 기준 집중도 */
  scheduledTimeFocus: TimeFocusBucket;
  /** 실제 완료 시각 기준 집중도 */
  completionTimeFocus: TimeFocusBucket;
  /** 완료가 많은 요일(월~일) */
  weekdayCompletion: Record<string, number>;
  mostProductiveWeekday: string | null;
  mostProductiveTimeBucket: keyof TimeFocusBucket | null;
  previousPeriod: PeriodSnapshot | null;
  /** 기간 내 일별 완료 추이 */
  dailyTrend: DailyTrendPoint[];
  /** 이전 기간 vs 현재 완료율 비교 */
  trendComparison: TrendComparisonPoint[];
  /** UI 호환용 — scheduledTimeFocus 별칭 */
  timeFocus: TimeFocusBucket;
};

export type PeriodWindow = {
  startDate: string;
  endDate: string;
  label: string;
};

type SummarizeValidationResult =
  | { ok: true; period: SummarizePeriod; timezone: string }
  | { ok: false; error: string };

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

const emptyTimeFocus = (): TimeFocusBucket => ({
  morning: 0,
  afternoon: 0,
  evening: 0,
  night: 0,
  unset: 0,
});

const emptyPriorityCount = (): Record<TodoPriority, number> => ({
  high: 0,
  medium: 0,
  low: 0,
});

const emptyCategoryCount = (): Record<TodoCategory, number> => ({
  업무: 0,
  개인: 0,
  건강: 0,
  학습: 0,
  기타: 0,
});

/**
 * 비율을 소수 첫째 자리(%)로 반올림한다.
 */
const toRate = (completed: number, total: number): number =>
  total === 0 ? 0 : Math.round((completed / total) * 1000) / 10;

/**
 * 요약 API 요청 본문을 검증한다.
 */
export const validateSummarizeRequest = (
  body: unknown
): SummarizeValidationResult => {
  if (body == null || typeof body !== "object") {
    return { ok: false, error: "요청 본문이 올바르지 않아요." };
  }

  const parsed = summarizeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      error: "분석 기간은 today 또는 week만 지원해요.",
    };
  }

  return {
    ok: true,
    period: parsed.data.period,
    timezone: parsed.data.timezone || "Asia/Seoul",
  };
};

/**
 * 타임존 기준 요일(0=일 … 6=토)을 반환한다.
 */
const getWeekdayInTimeZone = (date: Date, timeZone: string): number => {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[label] ?? 0;
};

/**
 * YYYY-MM-DD의 한국어 요일 라벨을 반환한다.
 */
export const getWeekdayLabel = (dateStr: string): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return WEEKDAY_KO[utc.getUTCDay()] ?? "?";
};

/**
 * 오늘 또는 이번 주(월~일) 날짜 구간을 계산한다.
 */
export const getPeriodWindow = (
  period: SummarizePeriod,
  now: Date,
  timeZone: string
): PeriodWindow => {
  const today = getDateInTimeZone(now, timeZone);

  if (period === "today") {
    return {
      startDate: today,
      endDate: today,
      label: "오늘",
    };
  }

  const weekday = getWeekdayInTimeZone(now, timeZone);
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  const monday = addDaysToDateString(today, -daysFromMonday);
  const sunday = addDaysToDateString(monday, 6);

  return {
    startDate: monday,
    endDate: sunday,
    label: "이번 주",
  };
};

/**
 * 직전 비교 기간(어제 / 지난주) 구간을 계산한다.
 */
export const getPreviousPeriodWindow = (
  period: SummarizePeriod,
  now: Date,
  timeZone: string
): PeriodWindow => {
  const current = getPeriodWindow(period, now, timeZone);

  if (period === "today") {
    const yesterday = addDaysToDateString(current.startDate, -1);
    return {
      startDate: yesterday,
      endDate: yesterday,
      label: "어제",
    };
  }

  return {
    startDate: addDaysToDateString(current.startDate, -7),
    endDate: addDaysToDateString(current.endDate, -7),
    label: "지난주",
  };
};

/**
 * ISO 시각을 타임존 기준 YYYY-MM-DD로 변환한다.
 */
export const toDateStringInTimeZone = (
  iso: string | null | undefined,
  timeZone: string
): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return getDateInTimeZone(date, timeZone);
};

/**
 * 타임존 기준 시각(0–23)을 반환한다.
 */
export const getHourInTimeZone = (
  iso: string | null | undefined,
  timeZone: string
): number | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const hourPart = parts.find((part) => part.type === "hour")?.value;
  if (hourPart == null) return null;
  const hour = Number(hourPart);
  return Number.isFinite(hour) ? hour : null;
};

/**
 * 시각을 아침/오후/저녁/밤 버킷으로 나눈다.
 */
export const toTimeBucket = (
  hour: number | null
): keyof TimeFocusBucket => {
  if (hour == null) return "unset";
  if (hour >= 5 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 17) return "afternoon";
  if (hour >= 18 && hour <= 21) return "evening";
  return "night";
};

/**
 * 버킷 중 최댓값 키를 고른다(전부 0이면 null).
 */
const pickDominantBucket = (
  focus: TimeFocusBucket
): keyof TimeFocusBucket | null => {
  const entries = (
    Object.entries(focus) as [keyof TimeFocusBucket, number][]
  ).filter(([key]) => key !== "unset");
  const best = entries.reduce(
    (acc, cur) => (cur[1] > acc[1] ? cur : acc),
    entries[0] ?? (["afternoon", 0] as [keyof TimeFocusBucket, number])
  );
  return best[1] > 0 ? best[0] : null;
};

/**
 * 할 일이 분석 기간에 포함되는지 판별한다.
 */
export const isTodoInPeriod = (
  todo: Todo,
  period: SummarizePeriod,
  window: PeriodWindow,
  timeZone: string
): boolean => {
  const due = toDateStringInTimeZone(todo.due_date, timeZone);
  const created = toDateStringInTimeZone(todo.created_at, timeZone);
  const updated = toDateStringInTimeZone(todo.updated_at, timeZone);

  const inRange = (date: string | null) =>
    date != null && date >= window.startDate && date <= window.endDate;

  if (period === "today") {
    return inRange(due) || inRange(created) || inRange(updated);
  }

  return inRange(due) || inRange(created) || inRange(updated);
};

/**
 * 지정 구간에 해당하는 할 일만 남긴다.
 */
export const filterTodosForWindow = (
  todos: Todo[],
  period: SummarizePeriod,
  window: PeriodWindow,
  timeZone: string
): Todo[] =>
  todos.filter((todo) => isTodoInPeriod(todo, period, window, timeZone));

/**
 * 기간에 해당하는 할 일만 남긴다.
 */
export const filterTodosForPeriod = (
  todos: Todo[],
  period: SummarizePeriod,
  now: Date,
  timeZone: string
): Todo[] => {
  const window = getPeriodWindow(period, now, timeZone);
  return filterTodosForWindow(todos, period, window, timeZone);
};

/**
 * 완료율·마감 준수·연기·생산성 패턴 통계를 계산한다.
 */
export const buildSummarizeStats = (
  todos: Todo[],
  previousTodos: Todo[],
  period: SummarizePeriod,
  window: PeriodWindow,
  previousWindow: PeriodWindow,
  now: Date,
  timeZone: string
): SummarizeStats => {
  const today = getDateInTimeZone(now, timeZone);
  const total = todos.length;
  const completed = todos.filter((todo) => todo.completed).length;
  const remaining = total - completed;

  const priority = emptyPriorityCount();
  const remainingByPriority = emptyPriorityCount();
  const deferredByCategory = emptyCategoryCount();
  const deferredByPriority = emptyPriorityCount();
  const scheduledTimeFocus = emptyTimeFocus();
  const completionTimeFocus = emptyTimeFocus();
  const weekdayCompletion: Record<string, number> = {
    월: 0,
    화: 0,
    수: 0,
    목: 0,
    금: 0,
    토: 0,
    일: 0,
  };

  const priorityTotals = emptyPriorityCount();
  const priorityCompleted = emptyPriorityCount();

  let overdue = 0;
  let deferredCount = 0;
  let deadlineOnTime = 0;
  let deadlineSettled = 0;

  for (const todo of todos) {
    priority[todo.priority] += 1;
    priorityTotals[todo.priority] += 1;
    if (todo.completed) {
      priorityCompleted[todo.priority] += 1;
    } else {
      remainingByPriority[todo.priority] += 1;
    }

    const dueLocal = toDateStringInTimeZone(todo.due_date, timeZone);
    const dueHour = getHourInTimeZone(todo.due_date, timeZone);
    scheduledTimeFocus[toTimeBucket(dueHour)] += 1;

    if (todo.completed) {
      const doneLocal = toDateStringInTimeZone(todo.updated_at, timeZone);
      const doneHour = getHourInTimeZone(todo.updated_at, timeZone);
      completionTimeFocus[toTimeBucket(doneHour)] += 1;
      if (doneLocal) {
        const label = getWeekdayLabel(doneLocal);
        weekdayCompletion[label] = (weekdayCompletion[label] ?? 0) + 1;
      }

      if (dueLocal && doneLocal) {
        deadlineSettled += 1;
        if (doneLocal <= dueLocal) {
          deadlineOnTime += 1;
        } else {
          deferredCount += 1;
          deferredByCategory[todo.category] += 1;
          deferredByPriority[todo.priority] += 1;
        }
      }
    } else if (dueLocal && dueLocal < today) {
      overdue += 1;
      deferredCount += 1;
      deferredByCategory[todo.category] += 1;
      deferredByPriority[todo.priority] += 1;
      deadlineSettled += 1;
    }
  }

  const priorityCompletion = Object.fromEntries(
    TODO_PRIORITIES.map((key) => [
      key,
      {
        total: priorityTotals[key],
        completed: priorityCompleted[key],
        remaining: Math.max(0, priorityTotals[key] - priorityCompleted[key]),
        completionRate: toRate(priorityCompleted[key], priorityTotals[key]),
      },
    ])
  ) as Record<TodoPriority, PriorityBreakdown>;

  const previousTotal = previousTodos.length;
  const previousCompleted = previousTodos.filter((t) => t.completed).length;
  const previousRate = toRate(previousCompleted, previousTotal);
  const completionRate = toRate(completed, total);
  const completionRateDelta =
    previousTotal === 0 && total === 0
      ? null
      : Math.round((completionRate - previousRate) * 10) / 10;

  const mostProductiveWeekday =
    Object.entries(weekdayCompletion).sort((a, b) => b[1] - a[1])[0]?.[1] > 0
      ? Object.entries(weekdayCompletion).sort((a, b) => b[1] - a[1])[0]![0]
      : null;

  const dailyTrend: DailyTrendPoint[] = [];
  let cursor = window.startDate;
  while (cursor <= window.endDate) {
    const dayTodos = todos.filter((todo) => {
      const due = toDateStringInTimeZone(todo.due_date, timeZone);
      const created = toDateStringInTimeZone(todo.created_at, timeZone);
      const updated = toDateStringInTimeZone(todo.updated_at, timeZone);
      return due === cursor || created === cursor || updated === cursor;
    });
    const dayCompleted = dayTodos.filter((todo) => todo.completed).length;
    dailyTrend.push({
      date: cursor,
      weekday: getWeekdayLabel(cursor),
      total: dayTodos.length,
      completed: dayCompleted,
      rate: toRate(dayCompleted, dayTodos.length),
    });
    cursor = addDaysToDateString(cursor, 1);
  }

  return {
    total,
    completed,
    remaining,
    overdue,
    completionRate,
    completionRateDelta,
    deadlineComplianceRate: toRate(deadlineOnTime, deadlineSettled),
    deferredCount,
    priority,
    priorityCompletion,
    remainingByPriority,
    deferredByCategory,
    deferredByPriority,
    scheduledTimeFocus,
    completionTimeFocus,
    weekdayCompletion,
    mostProductiveWeekday,
    mostProductiveTimeBucket: pickDominantBucket(completionTimeFocus),
    previousPeriod: {
      label: previousWindow.label,
      startDate: previousWindow.startDate,
      endDate: previousWindow.endDate,
      total: previousTotal,
      completed: previousCompleted,
      completionRate: previousRate,
    },
    dailyTrend,
    trendComparison: [
      { label: previousWindow.label, rate: previousRate },
      { label: window.label, rate: completionRate },
    ],
    timeFocus: scheduledTimeFocus,
  };
};

/**
 * 미완료 할 일을 우선순위 순으로 정리한다.
 */
export const toRemainingTodoItems = (todos: Todo[]): RemainingTodoItem[] => {
  const order: Record<TodoPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return todos
    .filter((todo) => !todo.completed)
    .sort((a, b) => {
      const byPriority = order[a.priority] - order[b.priority];
      if (byPriority !== 0) return byPriority;
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
      return aDue - bDue;
    })
    .map((todo) => ({
      id: todo.id,
      title: todo.title,
      priority: todo.priority,
      due_date: todo.due_date,
    }));
};

/**
 * AI에 넘길 간결한 할 일 페이로드를 만든다.
 */
export const toSummaryTodoPayload = (todos: Todo[], timeZone: string) =>
  todos.map((todo) => {
    const dueLocal = toDateStringInTimeZone(todo.due_date, timeZone);
    const doneLocal = todo.completed
      ? toDateStringInTimeZone(todo.updated_at, timeZone)
      : null;
    const createdLocal = toDateStringInTimeZone(todo.created_at, timeZone);

    let deadlineStatus: "on_time" | "late" | "overdue" | "open" | "no_due" =
      "no_due";
    if (!dueLocal) {
      deadlineStatus = todo.completed ? "open" : "no_due";
    } else if (todo.completed && doneLocal) {
      deadlineStatus = doneLocal <= dueLocal ? "on_time" : "late";
    } else if (!todo.completed) {
      const today = getDateInTimeZone(new Date(), timeZone);
      deadlineStatus = dueLocal < today ? "overdue" : "open";
    }

    return {
      title: todo.title,
      completed: todo.completed,
      priority: todo.priority,
      category: todo.category,
      due_date: todo.due_date,
      due_local: dueLocal,
      due_hour: getHourInTimeZone(todo.due_date, timeZone),
      created_local: createdLocal,
      completed_local: doneLocal,
      completed_hour: todo.completed
        ? getHourInTimeZone(todo.updated_at, timeZone)
        : null,
      deadline_status: deadlineStatus,
      same_day_complete:
        Boolean(todo.completed && createdLocal && doneLocal) &&
        createdLocal === doneLocal,
    };
  });

/**
 * 할 일이 없을 때 기본 요약을 반환한다.
 */
export const buildEmptySummary = (period: SummarizePeriod): AiSummary => {
  const label = period === "today" ? "오늘" : "이번 주";
  return {
    summary: `${label} 분석할 할 일이 아직 없어요.`,
    urgentTasks: [],
    strengths: [
      "기록을 시작하려는 마음만으로도 이미 좋은 출발이에요. 작은 할 일 하나부터 적어 볼까요?",
    ],
    insights: [
      `${label}에 해당하는 할 일이 없어 완료율·시간대 분석을 할 수 없어요.`,
      "마감 시각을 함께 적어두면 시간대별 집중도와 마감 준수율 분석이 더 정확해져요.",
    ],
    recommendations: [
      "자연어로 첫 할 일을 추가해 하루 계획을 시작해 보세요.",
      period === "today"
        ? "오늘 꼭 끝낼 일 1개만 high 우선순위로 잡아 집중해 보세요."
        : "다음 주 월·수·금처럼 분산된 마감을 미리 배치해 보세요.",
    ],
    nextWeekPlan:
      period === "week"
        ? [
            "다음 주 월·수·금 오전에 high 작업을 나눠 배치해 보세요.",
            "마감이 몰린 날은 저우선순위 작업을 다른 날로 옮겨 보세요.",
          ]
        : [],
  };
};

const TIME_BUCKET_KO: Record<keyof TimeFocusBucket, string> = {
  morning: "아침(05–11시)",
  afternoon: "오후(12–17시)",
  evening: "저녁(18–21시)",
  night: "밤/새벽",
  unset: "시각 미정",
};

/**
 * Gemini 시스템 프롬프트를 구성한다.
 */
export const buildSummarizeSystemPrompt = (
  period: SummarizePeriod,
  window: PeriodWindow,
  timeZone: string,
  stats: SummarizeStats
): string => {
  const periodLabel = period === "today" ? "오늘의 요약" : "이번 주 요약";
  const deltaText =
    stats.completionRateDelta == null
      ? "비교할 이전 기간 데이터가 부족함"
      : `${stats.completionRateDelta >= 0 ? "+" : ""}${stats.completionRateDelta}%p (${stats.previousPeriod?.label ?? "이전"} ${stats.previousPeriod?.completionRate ?? 0}% → 현재 ${stats.completionRate}%)`;

  const priorityLines = TODO_PRIORITIES.map((key) => {
    const row = stats.priorityCompletion[key];
    return `  - ${key}: 완료 ${row.completed}/${row.total} (완료율 ${row.completionRate}%), 남은 일 ${row.remaining}`;
  }).join("\n");

  const deferredCategoryLines = TODO_CATEGORIES.filter(
    (key) => stats.deferredByCategory[key] > 0
  )
    .map((key) => `  - ${key}: ${stats.deferredByCategory[key]}건`)
    .join("\n");

  const periodFocus =
    period === "today"
      ? `【오늘의 요약 초점】
- 당일 집중도(예정 시간대 vs 실제 완료 시간대)를 짧게 해석하세요.
- 남은 할 일을 우선순위(high→medium→low) 순으로 무엇을 먼저 할지 제시하세요.
- 오늘 안에 끝낼 수 있는 현실적인 순서와 시간 블록을 추천하세요.
- 다음 주 계획보다 "지금~오늘 밤" 실행에 무게를 두세요.
- nextWeekPlan은 반드시 빈 배열([])로 두세요.`
      : `【이번 주 요약 초점】
- 주간 완료·연기·요일/시간대 패턴을 종합해 해석하세요.
- 가장 생산적인 요일·시간대를 근거와 함께 알려 주세요.
- 자주 미루는 작업 유형(카테고리·우선순위)을 짚어 주세요.
- 다음 주 일정 재배치·업무 분산 전략을 nextWeekPlan에 2–5개로 구체적으로 제안하세요.`;

  return `당신은 개인 할 일 관리 앱의 따뜻하고 전문적인 한국어 생산성 코치입니다.
사용자 할 일 데이터를 분석해 "${periodLabel}"을 작성하세요.
문장은 사용자가 바로 이해하고 실천할 수 있는 자연스러운 존댓말로 씁니다.

분석 기간: ${window.label} (${window.startDate} ~ ${window.endDate}, 타임존 ${timeZone})

====================
1) 완료율 분석 (반드시 반영)
====================
- 현재 완료율: ${stats.completionRate}% (총 ${stats.total}개 중 ${stats.completed}개 완료, 남은 일 ${stats.remaining}개)
- 이전 기간 대비 개선도: ${deltaText}
- 우선순위별 완료 패턴:
${priorityLines}

====================
2) 시간 관리 분석 (반드시 반영)
====================
- 마감일 준수율: ${stats.deadlineComplianceRate}% (마감이 있는 항목 기준 정시 완료 비율)
- 연기/지연 빈도: ${stats.deferredCount}건 (지연 ${stats.overdue}건 포함)
- 연기 패턴(카테고리):
${deferredCategoryLines || "  - 두드러진 연기 카테고리 없음"}
- 예정 마감 시간대 분포: 아침 ${stats.scheduledTimeFocus.morning}, 오후 ${stats.scheduledTimeFocus.afternoon}, 저녁 ${stats.scheduledTimeFocus.evening}, 밤 ${stats.scheduledTimeFocus.night}, 미정 ${stats.scheduledTimeFocus.unset}
- 실제 완료 시간대 분포: 아침 ${stats.completionTimeFocus.morning}, 오후 ${stats.completionTimeFocus.afternoon}, 저녁 ${stats.completionTimeFocus.evening}, 밤 ${stats.completionTimeFocus.night}, 미정 ${stats.completionTimeFocus.unset}

====================
3) 생산성 패턴 (반드시 반영)
====================
- 요일별 완료 수: ${Object.entries(stats.weekdayCompletion)
    .map(([day, count]) => `${day} ${count}`)
    .join(", ")}
- 가장 생산적인 요일: ${stats.mostProductiveWeekday ? `${stats.mostProductiveWeekday}요일` : "데이터 부족"}
- 가장 생산적인 완료 시간대: ${
    stats.mostProductiveTimeBucket
      ? TIME_BUCKET_KO[stats.mostProductiveTimeBucket]
      : "데이터 부족"
  }
- 완료하기 쉬운 작업의 공통점: same_day_complete=true, 낮은 우선순위, 짧은 제목/명확한 카테고리 등을 할 일 JSON에서 찾아 요약하세요.
- 자주 미루는 유형: deadline_status가 late/overdue인 항목의 카테고리·우선순위 공통점을 식별하세요.

====================
4) 실행 가능한 추천 (recommendations)
====================
- 구체적인 시간 관리 팁 (예: "오늘 15–16시에 high 작업 1개만")
- 우선순위 조정·일정 재배치 제안
- 업무 과부하를 줄이는 분산 전략 (요일/시간대에 나눠 배치)
- 추상적 조언("열심히 하세요") 금지. 숫자·시간·우선순위를 넣을 것

====================
5) 긍정적인 피드백 (strengths)
====================
- 사용자가 잘하고 있는 부분을 먼저 구체적으로 칭찬하세요.
- 개선점도 비난하지 말고 격려하는 톤으로 바꾸어 제시하세요.
- 짧은 동기부여 문장을 1개 이상 포함하세요.

====================
6) 기간별 차별화
====================
${periodFocus}

====================
7) 출력 문장 품질
====================
- summary: 완료율과(가능하면) 이전 대비 변화를 자연스러운 한국어 1–2문장으로
- urgentTasks: 긴급·임박·지연 제목만 (없으면 [])
- strengths: 칭찬·동기부여 1–4개
- insights: 완료율/시간관리/생산성 패턴을 쉬운 문장으로 2–8개
- recommendations: 바로 실천 가능한 조언 2–6개
- nextWeekPlan: 이번 주 요약이면 다음 주 계획 2–5개, 오늘의 요약이면 []
- 통계에 없는 사실을 지어내지 말 것
- JSON 스키마 필드를 정확히 채울 것`;
};

/**
 * 사용자 프롬프트(할 일 JSON)를 구성한다.
 */
export const buildSummarizeUserPrompt = (
  todosPayload: ReturnType<typeof toSummaryTodoPayload>,
  stats: SummarizeStats,
  period: SummarizePeriod
): string => {
  const remainingHigh = todosPayload
    .filter((todo) => !todo.completed && todo.priority === "high")
    .map((todo) => todo.title);

  return `기간 유형: ${period === "today" ? "today(오늘)" : "week(이번 주)"}

사전 계산 통계 JSON:
${JSON.stringify(stats, null, 2)}

남은 high 우선순위 제목: ${JSON.stringify(remainingHigh)}

할 일 목록 JSON:
${JSON.stringify(todosPayload, null, 2)}

위 데이터를 바탕으로 시스템 지시의 7가지 분석 축을 모두 반영해 요약을 작성하세요.`;
};
