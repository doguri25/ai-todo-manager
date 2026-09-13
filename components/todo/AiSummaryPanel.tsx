"use client";

import { useState } from "react";
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  HeartIcon,
  LightbulbIcon,
  ListTodoIcon,
  SparklesIcon,
  TargetIcon,
  TrendingUpIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type {
  AiSummary,
  RemainingTodoItem,
  SummarizePeriod,
  SummarizeStats,
} from "@/lib/ai/summarize";
import { PRIORITY_CLASS, PRIORITY_LABELS } from "@/lib/todos/status";
import { cn } from "@/lib/utils";

type SummaryCacheEntry = {
  result: AiSummary;
  stats: SummarizeStats;
  remainingTodos: RemainingTodoItem[];
};

type SummaryCache = Partial<Record<SummarizePeriod, SummaryCacheEntry>>;

type SummarizeApiResponse = {
  result?: AiSummary;
  stats?: SummarizeStats;
  remainingTodos?: RemainingTodoItem[];
  error?: string;
};

const WEEKDAY_ORDER = ["월", "화", "수", "목", "금", "토", "일"] as const;

const trendChartConfig = {
  rate: {
    label: "완료율",
    color: "var(--color-brand-ai)",
  },
} satisfies ChartConfig;

const weekdayChartConfig = {
  completed: {
    label: "완료 수",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig;

type AiSummaryPanelProps = {
  /** 사이드바·모바일에서 공간을 덜 쓰도록 밀도 높은 레이아웃 */
  compact?: boolean;
};

/**
 * 오늘의 요약 / 이번 주 요약 탭과 AI 분석 결과를 보여준다.
 */
export const AiSummaryPanel = ({ compact = false }: AiSummaryPanelProps) => {
  const [period, setPeriod] = useState<SummarizePeriod>("today");
  const [cache, setCache] = useState<SummaryCache>({});
  const [errors, setErrors] = useState<Partial<Record<SummarizePeriod, string>>>(
    {}
  );
  const [loadingPeriod, setLoadingPeriod] = useState<SummarizePeriod | null>(
    null
  );

  /**
   * 지정 기간의 할 일을 AI로 요약한다.
   */
  const handleSummarize = async (requestPeriod: SummarizePeriod) => {
    setLoadingPeriod(requestPeriod);
    setErrors((prev) => ({ ...prev, [requestPeriod]: undefined }));

    try {
      const response = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: requestPeriod,
          timezone: "Asia/Seoul",
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | SummarizeApiResponse
        | null;

      if (!response.ok || !payload?.result || !payload.stats) {
        setErrors((prev) => ({
          ...prev,
          [requestPeriod]:
            payload?.error ??
            "AI 요약을 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
        }));
        return;
      }

      setCache((prev) => ({
        ...prev,
        [requestPeriod]: {
          result: payload.result!,
          stats: payload.stats!,
          remainingTodos: payload.remainingTodos ?? [],
        },
      }));
    } catch (summarizeError) {
      if (process.env.NODE_ENV === "development") {
        console.error("[AiSummaryPanel]", summarizeError);
      }
      setErrors((prev) => ({
        ...prev,
        [requestPeriod]: "네트워크 연결을 확인하고 다시 시도해 주세요.",
      }));
    } finally {
      setLoadingPeriod((currentLoading) =>
        currentLoading === requestPeriod ? null : currentLoading
      );
    }
  };

  return (
    <Card size="sm" className={cn("shadow-sm", compact && "max-h-[calc(100vh-7rem)] overflow-y-auto")}>
      <CardHeader className={cn(compact && "gap-1 pb-2")}>
        <CardTitle className="flex items-center gap-2 text-base">
          <SparklesIcon className="size-4 text-brand-ai" aria-hidden />
          AI 요약 및 분석
        </CardTitle>
        {!compact ? (
          <CardDescription>
            탭을 고른 뒤 AI 요약 보기로 당일 집중도 또는 주간 패턴을 확인해
            보세요.
          </CardDescription>
        ) : (
          <CardDescription className="text-xs">
            오늘·주간 패턴을 빠르게 확인하세요.
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className={cn(compact && "pt-0")}>
        <Tabs
          value={period}
          onValueChange={(value) => {
            if (value === "today" || value === "week") {
              setPeriod(value);
            }
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger value="today" className="flex-1">
              오늘의 요약
            </TabsTrigger>
            <TabsTrigger value="week" className="flex-1">
              이번 주 요약
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-3 space-y-3">
            <PeriodIntro
              title="당일 집중 분석"
              description="완료율·남은 일·집중 작업을 정리해요."
              compact={compact}
              isLoading={loadingPeriod === "today"}
              onSummarize={() => {
                void handleSummarize("today");
              }}
            />
            <SummaryBody
              period="today"
              compact={compact}
              isLoading={loadingPeriod === "today"}
              error={errors.today ?? null}
              current={cache.today ?? null}
              onRetry={() => {
                void handleSummarize("today");
              }}
            />
          </TabsContent>

          <TabsContent value="week" className="mt-3 space-y-3">
            <PeriodIntro
              title="주간 패턴 분석"
              description="완료 추이·요일 생산성·다음 주 계획."
              compact={compact}
              isLoading={loadingPeriod === "week"}
              onSummarize={() => {
                void handleSummarize("week");
              }}
            />
            <SummaryBody
              period="week"
              compact={compact}
              isLoading={loadingPeriod === "week"}
              error={errors.week ?? null}
              current={cache.week ?? null}
              onRetry={() => {
                void handleSummarize("week");
              }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

type PeriodIntroProps = {
  title: string;
  description: string;
  compact?: boolean;
  isLoading: boolean;
  onSummarize: () => void;
};

/**
 * 탭 상단 안내와 AI 요약 보기 버튼을 표시한다.
 */
const PeriodIntro = ({
  title,
  description,
  compact = false,
  isLoading,
  onSummarize,
}: PeriodIntroProps) => (
  <div
    className={cn(
      "flex flex-col gap-2 rounded-2xl border border-border/70 bg-muted/30 p-3",
      !compact && "sm:flex-row sm:items-center sm:justify-between sm:gap-3"
    )}
  >
    <div className="min-w-0 space-y-0.5">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Button
      type="button"
      size="sm"
      className="w-full shrink-0"
      disabled={isLoading}
      onClick={onSummarize}
      aria-busy={isLoading}
    >
      <SparklesIcon data-icon="inline-start" />
      {isLoading ? "분석 중..." : "AI 요약 보기"}
    </Button>
  </div>
);

type SummaryBodyProps = {
  period: SummarizePeriod;
  compact?: boolean;
  isLoading: boolean;
  error: string | null;
  current: SummaryCacheEntry | null;
  onRetry: () => void;
};

/**
 * 탭별 로딩·오류·결과 본문을 렌더링한다.
 */
const SummaryBody = ({
  period,
  compact = false,
  isLoading,
  error,
  current,
  onRetry,
}: SummaryBodyProps) => {
  const label = period === "today" ? "오늘" : "이번 주";

  if (isLoading) {
    return <SummaryLoading period={period} />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>요약을 만들지 못했어요</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <span>{error}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full shrink-0 border-destructive/40 bg-background"
            onClick={onRetry}
          >
            재시도
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!current) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-ai/30 bg-brand-ai/5 px-3 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          {label} 할 일을 분석하려면{" "}
          <span className="font-medium text-foreground">AI 요약 보기</span>를
          눌러 주세요.
        </p>
      </div>
    );
  }

  if (period === "today") {
    return <TodaySummaryResult current={current} compact={compact} />;
  }

  return <WeekSummaryResult current={current} compact={compact} />;
};

/**
 * 분석 중 스켈레톤(회전 애니메이션 없이)을 표시한다.
 */
const SummaryLoading = ({ period }: { period: SummarizePeriod }) => (
  <div
    className="space-y-4"
    aria-busy="true"
    aria-label={`${period === "today" ? "오늘" : "이번 주"} AI 요약 분석 중`}
  >
    <div className="rounded-2xl border border-border/60 p-4">
      <Skeleton className="mb-3 h-4 w-24" />
      <Skeleton className="mb-2 h-10 w-28" />
      <Skeleton className="h-3 w-full" />
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
    </div>
    {period === "week" ? (
      <Skeleton className="h-48 w-full rounded-2xl" />
    ) : (
      <Skeleton className="h-36 w-full rounded-2xl" />
    )}
    <div className="grid gap-2 sm:grid-cols-2">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
    </div>
  </div>
);

type ResultProps = {
  current: SummaryCacheEntry;
  compact?: boolean;
};

/**
 * 오늘의 요약 결과 UI를 렌더링한다.
 */
const TodaySummaryResult = ({ current, compact = false }: ResultProps) => {
  const { result, stats, remainingTodos } = current;
  const focusTitles = new Set(result.urgentTasks);
  const focusTodos = remainingTodos.filter((todo) =>
    focusTitles.has(todo.title)
  );
  const highlightTodos =
    focusTodos.length > 0
      ? focusTodos
      : remainingTodos.filter((todo) => todo.priority === "high").length > 0
        ? remainingTodos.filter((todo) => todo.priority === "high")
        : remainingTodos.slice(0, 3);
  const highlightIds = new Set(highlightTodos.map((todo) => todo.id));
  const listTodos = remainingTodos.filter((todo) => !highlightIds.has(todo.id));

  return (
    <div className={cn("space-y-3", !compact && "space-y-4")}>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {result.summary}
      </p>

      <CompletionRateCard stats={stats} compact={compact} />

      {highlightTodos.length > 0 ? (
        <section className="space-y-2 rounded-2xl border border-brand-ai/35 bg-brand-ai/8 p-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <TargetIcon className="size-4 text-brand-ai" aria-hidden />
            오늘 집중할 작업
          </h3>
          <ul className="space-y-2">
            {highlightTodos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-start justify-between gap-2 rounded-xl bg-background/80 px-3 py-2"
              >
                <span className="min-w-0 text-sm font-medium">{todo.title}</span>
                <Badge
                  variant="outline"
                  className={cn("shrink-0", PRIORITY_CLASS[todo.priority])}
                >
                  {PRIORITY_LABELS[todo.priority]}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <ListTodoIcon className="size-4" aria-hidden />
          남은 할 일
          <Badge variant="secondary" className="ml-1">
            {remainingTodos.length}개
          </Badge>
        </h3>
        {remainingTodos.length === 0 ? (
          <p className="rounded-2xl border border-dashed px-3 py-4 text-sm text-muted-foreground">
            남은 할 일이 없어요. 오늘 목표를 잘 소화하고 있어요!
          </p>
        ) : listTodos.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            남은 일이 모두 위 집중 작업에 포함되어 있어요.
          </p>
        ) : (
          <ul className="space-y-2">
            {listTodos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm">{todo.title}</span>
                <Badge
                  variant="outline"
                  className={cn("shrink-0", PRIORITY_CLASS[todo.priority])}
                >
                  {PRIORITY_LABELS[todo.priority]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CommonAnalysisSections result={result} compact={compact} />
    </div>
  );
};

/**
 * 이번 주 요약 결과 UI를 렌더링한다.
 */
const WeekSummaryResult = ({ current, compact = false }: ResultProps) => {
  const { result, stats } = current;
  const weekdayData = WEEKDAY_ORDER.map((day) => ({
    day,
    completed: stats.weekdayCompletion[day] ?? 0,
  }));
  const trendData = stats.trendComparison.map((point) => ({
    label: point.label,
    rate: point.rate,
  }));

  return (
    <div className={cn("space-y-3", !compact && "space-y-4")}>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {result.summary}
      </p>

      <CompletionRateCard stats={stats} compact={compact} />

      <div className={cn("grid gap-3", !compact && "lg:grid-cols-2")}>
        <section className="rounded-2xl border border-border/70 p-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <TrendingUpIcon className="size-4 text-brand-ai" aria-hidden />
            주간 완료율 트렌드
          </h3>
          <ChartContainer
            config={trendChartConfig}
            className="aspect-[16/10] w-full"
            initialDimension={{ width: 280, height: 150 }}
          >
            <LineChart data={trendData} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                width={32}
                tickFormatter={(value) => `${value}%`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => `${Number(value)}%`}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="var(--color-rate)"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
          {stats.completionRateDelta != null ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {stats.previousPeriod?.label ?? "이전"} 대비{" "}
              <span className="font-medium text-foreground">
                {stats.completionRateDelta >= 0 ? "+" : ""}
                {stats.completionRateDelta}%p
              </span>
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border/70 p-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <CalendarDaysIcon className="size-4 text-brand-ai" aria-hidden />
            요일별 생산성
          </h3>
          <ChartContainer
            config={weekdayChartConfig}
            className="aspect-[16/10] w-full"
            initialDimension={{ width: 280, height: 150 }}
          >
            <BarChart data={weekdayData} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="completed"
                fill="var(--color-completed)"
                radius={6}
              />
            </BarChart>
          </ChartContainer>
          {stats.mostProductiveWeekday ? (
            <p className="mt-2 text-xs text-muted-foreground">
              가장 생산적인 요일:{" "}
              <span className="font-medium text-foreground">
                {stats.mostProductiveWeekday}요일
              </span>
            </p>
          ) : null}
        </section>
      </div>

      {result.nextWeekPlan.length > 0 ? (
        <section className="space-y-2 rounded-2xl border border-border/70 bg-muted/20 p-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <CalendarDaysIcon className="size-4" aria-hidden />
            다음 주 계획 제안
          </h3>
          <ol className="space-y-2">
            {result.nextWeekPlan.map((item, index) => (
              <li
                key={item}
                className="flex gap-3 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <CommonAnalysisSections result={result} compact={compact} />
    </div>
  );
};

/**
 * 완료율을 큰 숫자와 진행바로 보여준다.
 */
const CompletionRateCard = ({
  stats,
  compact = false,
}: {
  stats: SummarizeStats;
  compact?: boolean;
}) => (
  <section className="rounded-2xl border border-border/70 p-3 sm:p-4">
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <p className="text-xs font-medium text-muted-foreground">완료율</p>
        <p
          className={cn(
            "font-semibold tracking-tight tabular-nums",
            compact ? "text-3xl" : "text-4xl sm:text-5xl"
          )}
        >
          {stats.completionRate}
          <span className="ml-1 text-lg font-medium text-muted-foreground">
            %
          </span>
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">
          {stats.completed}/{stats.total} 완료
        </Badge>
        <Badge variant="outline">남음 {stats.remaining}</Badge>
        {stats.overdue > 0 ? (
          <Badge variant="destructive">지연 {stats.overdue}</Badge>
        ) : null}
      </div>
    </div>
    <Progress value={Math.min(100, Math.max(0, stats.completionRate))}>
      <div className="mb-1 flex w-full items-center justify-between gap-2">
        <ProgressLabel>진행 상황</ProgressLabel>
        <ProgressValue />
      </div>
    </Progress>
  </section>
);

/**
 * 인사이트·추천·강점 공통 영역을 렌더링한다.
 */
const CommonAnalysisSections = ({
  result,
  compact = false,
}: {
  result: AiSummary;
  compact?: boolean;
}) => (
  <div className="space-y-3">
    {result.strengths.length > 0 ? (
      <section className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <HeartIcon className="size-4 text-brand-ai" aria-hidden />
          잘하고 있는 점
        </h3>
        <div className={cn("grid gap-2", !compact && "sm:grid-cols-2")}>
          {result.strengths.map((item) => (
            <InsightCard
              key={item}
              icon={CheckCircle2Icon}
              tone="positive"
              text={item}
            />
          ))}
        </div>
      </section>
    ) : null}

    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <LightbulbIcon className="size-4 text-brand-ai" aria-hidden />
        인사이트
      </h3>
      <div className={cn("grid gap-2", !compact && "sm:grid-cols-2")}>
        {result.insights.map((item, index) => (
          <InsightCard
            key={item}
            icon={index % 2 === 0 ? LightbulbIcon : AlertTriangleIcon}
            tone={index % 2 === 0 ? "insight" : "caution"}
            text={item}
          />
        ))}
      </div>
    </section>

    <section className="space-y-2">
      <h3 className="text-sm font-semibold">실행 추천</h3>
      <ol className="space-y-2">
        {result.recommendations.map((item, index) => (
          <li
            key={item}
            className="flex gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-ai/15 text-xs font-semibold text-brand-ai">
              {index + 1}
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-sm leading-relaxed">{item}</p>
              <Badge variant="outline" className="text-[10px]">
                바로 실천
              </Badge>
            </div>
          </li>
        ))}
      </ol>
    </section>
  </div>
);

type InsightCardProps = {
  icon: typeof LightbulbIcon;
  text: string;
  tone: "positive" | "insight" | "caution";
};

/**
 * 인사이트를 아이콘 카드로 표시한다.
 */
const InsightCard = ({ icon: Icon, text, tone }: InsightCardProps) => (
  <div
    className={cn(
      "flex gap-2.5 rounded-2xl border px-3 py-3",
      tone === "positive" && "border-brand-ai/25 bg-brand-ai/5",
      tone === "insight" && "border-border/70 bg-muted/20",
      tone === "caution" && "border-priority-medium/25 bg-priority-medium/5"
    )}
  >
    <Icon
      className={cn(
        "mt-0.5 size-4 shrink-0",
        tone === "positive" && "text-brand-ai",
        tone === "insight" && "text-foreground/70",
        tone === "caution" && "text-priority-medium"
      )}
      aria-hidden
    />
    <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
  </div>
);
