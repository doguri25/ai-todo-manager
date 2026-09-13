import { google } from "@ai-sdk/google";
import { generateObject, APICallError } from "ai";
import { NextResponse } from "next/server";

import {
  aiTodoRawSchema,
  buildParseTodoSystemPrompt,
  buildRelativeDateHints,
  postprocessAiTodo,
  validateAndNormalizeInput,
  type AiTodoRaw,
} from "@/lib/ai/parse-todo";
import { createClient } from "@/lib/supabase/server";

/** 우선 사용 모델 → 부하/장애 시 폴백 순서 */
const MODEL_CANDIDATES = [
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-3-flash-preview", // Gemini 3.0 Flash
] as const;

/**
 * 자연어 할 일을 구조화된 초안으로 변환한다.
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
    if (body == null || typeof body !== "object") {
      return NextResponse.json(
        { error: "요청 본문이 올바르지 않아요." },
        { status: 400 }
      );
    }

    const validated = validateAndNormalizeInput(body);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { text, timezone } = validated;
    const now = new Date();
    const dateHints = buildRelativeDateHints(now, timezone);
    const system = buildParseTodoSystemPrompt(timezone, dateHints);
    const prompt = `다음 문장을 할 일 JSON으로 변환하세요. 반드시 JSON 스키마를 준수하세요.\n\n"""${text}"""`;

    let object: AiTodoRaw | null = null;
    let lastError: unknown = null;

    for (const modelId of MODEL_CANDIDATES) {
      try {
        const result = await generateObject({
          model: google(modelId),
          schema: aiTodoRawSchema,
          temperature: 0.2,
          system,
          prompt,
        });
        object = result.object;
        if (process.env.NODE_ENV === "development") {
          console.info(`[parse-todo] model ok: ${modelId}`);
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
          console.warn(`[parse-todo] model failed: ${modelId}`, {
            status,
            message: error instanceof Error ? error.message : error,
          });
        }

        // 한도 초과는 즉시 429로 반환
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

    const draft = postprocessAiTodo(object, timezone, now);

    return NextResponse.json({
      draft,
      raw: {
        title: object.title,
        due_date: object.due_date,
        due_time: object.due_time,
        priority: object.priority,
        category: object.category,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/ai/parse-todo]", error);
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
          "AI 처리에 실패했어요. 잠시 후 다시 시도하거나 직접 입력해 주세요.",
      },
      { status: 500 }
    );
  }
};
