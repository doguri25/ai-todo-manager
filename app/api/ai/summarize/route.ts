import { google } from "@ai-sdk/google";
import { generateObject, APICallError } from "ai";
import { NextResponse } from "next/server";

import {
  aiSummarySchema,
  buildEmptySummary,
  buildSummarizeStats,
  buildSummarizeSystemPrompt,
  buildSummarizeUserPrompt,
  filterTodosForWindow,
  getPeriodWindow,
  getPreviousPeriodWindow,
  toRemainingTodoItems,
  toSummaryTodoPayload,
  validateSummarizeRequest,
  type AiSummary,
} from "@/lib/ai/summarize";
import { createClient } from "@/lib/supabase/server";
import type { Todo } from "@/lib/todos/types";

/** 우선 사용 모델 → 부하/장애 시 폴백 */
const MODEL_CANDIDATES = [
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
] as const;

/**
 * 사용자 할 일을 기간별로 분석해 AI 요약·인사이트를 반환한다.
 */
export const POST = async (request: Request) => {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "AI 설정이 완료되지 않았어요. 관리자에게 문의해 주세요.",
        },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "로그인이 필요해요. 다시 로그인해 주세요." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const validated = validateSummarizeRequest(body);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { period, timezone } = validated;
    const now = new Date();
    const window = getPeriodWindow(period, now, timezone);
    const previousWindow = getPreviousPeriodWindow(period, now, timezone);

    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", session.user.id)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[POST /api/ai/summarize] supabase", error);
      }
      return NextResponse.json(
        {
          error:
            "할 일 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
        },
        { status: 500 }
      );
    }

    const allTodos = (data as Todo[]) ?? [];
    const todos = filterTodosForWindow(allTodos, period, window, timezone);
    const previousTodos = filterTodosForWindow(
      allTodos,
      period,
      previousWindow,
      timezone
    );
    const stats = buildSummarizeStats(
      todos,
      previousTodos,
      period,
      window,
      previousWindow,
      now,
      timezone
    );

    const remainingTodos = toRemainingTodoItems(todos);

    if (todos.length === 0) {
      return NextResponse.json({
        period,
        window,
        stats,
        remainingTodos,
        result: buildEmptySummary(period),
      });
    }

    const system = buildSummarizeSystemPrompt(period, window, timezone, stats);
    const prompt = buildSummarizeUserPrompt(
      toSummaryTodoPayload(todos, timezone),
      stats,
      period
    );

    let object: AiSummary | null = null;
    let lastError: unknown = null;

    for (const modelId of MODEL_CANDIDATES) {
      try {
        const result = await generateObject({
          model: google(modelId),
          schema: aiSummarySchema,
          temperature: 0.4,
          system,
          prompt,
        });
        object = result.object;
        if (process.env.NODE_ENV === "development") {
          console.info(`[summarize] model ok: ${modelId}`);
        }
        break;
      } catch (error) {
        lastError = error;
        const status = APICallError.isInstance(error)
          ? error.statusCode
          : undefined;
        const retryable =
          status === 503 ||
          status === 429 ||
          (error instanceof Error &&
            /high demand|unavailable|overloaded|rate/i.test(error.message));

        if (process.env.NODE_ENV === "development") {
          console.warn(`[summarize] model failed: ${modelId}`, {
            status,
            message: error instanceof Error ? error.message : error,
          });
        }

        if (status === 429) {
          return NextResponse.json(
            {
              error:
                "AI 호출 한도를 초과했어요. 잠시 후 다시 시도해 주세요.",
            },
            { status: 429 }
          );
        }

        if (!retryable) {
          throw error;
        }
      }
    }

    if (!object) {
      throw lastError ?? new Error("All Gemini models failed");
    }

    if (period === "today") {
      object = { ...object, nextWeekPlan: [] };
    }

    return NextResponse.json({
      period,
      window,
      stats,
      remainingTodos,
      result: object,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/ai/summarize]", error);
    }

    const message =
      error instanceof Error ? error.message.toLowerCase() : "";
    const status = APICallError.isInstance(error)
      ? error.statusCode
      : undefined;

    if (status === 429 || message.includes("rate") || message.includes("quota")) {
      return NextResponse.json(
        {
          error:
            "AI 호출 한도를 초과했어요. 잠시 후 다시 시도해 주세요.",
        },
        { status: 429 }
      );
    }

    if (message.includes("api key") || message.includes("unauthorized")) {
      return NextResponse.json(
        { error: "AI 인증에 실패했어요. API 키 설정을 확인해 주세요." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error:
          "AI 요약에 실패했어요. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 }
    );
  }
};
