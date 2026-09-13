"use client";

import { useState, type FormEvent } from "react";
import { SparklesIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { TodoFormValues } from "@/lib/todos/types";

type AiTodoInputProps = {
  disabled?: boolean;
  onDraft: (draft: TodoFormValues) => void;
};

/**
 * AI로 할 일 만들기 버튼을 눌러 모달에서 자연어를 입력한다.
 */
export const AiTodoInput = ({ disabled = false, onDraft }: AiTodoInputProps) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  /**
   * 자연어를 API로 보내 할 일 초안을 받는다.
   */
  const handleParse = async (event?: FormEvent) => {
    event?.preventDefault();
    setError(null);

    const trimmed = text.trim();
    if (!trimmed) {
      setError("변환할 문장을 입력해 주세요.");
      return;
    }

    setIsParsing(true);
    try {
      const response = await fetch("/api/ai/parse-todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          timezone: "Asia/Seoul",
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        draft?: TodoFormValues;
        error?: string;
      } | null;

      if (!response.ok || !payload?.draft) {
        setError(
          payload?.error ??
            "자연어를 할 일로 변환하지 못했어요. 직접 입력해 주세요."
        );
        return;
      }

      onDraft(payload.draft);
      setText("");
      setOpen(false);
    } catch (parseError) {
      if (process.env.NODE_ENV === "development") {
        console.error("[AiTodoInput]", parseError);
      }
      setError("네트워크 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isParsing) return;
        setOpen(next);
        if (!next) {
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            className="mb-4 w-full"
            disabled={disabled}
          />
        }
      >
        <SparklesIcon data-icon="inline-start" />
        AI로 할 일 만들기
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg duration-200 data-open:zoom-in-95 data-closed:zoom-out-95">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-brand-ai" aria-hidden />
            AI로 할 일 만들기
          </DialogTitle>
          <DialogDescription>
            자연어로 적으면 제목·마감·우선순위 초안을 만들어 폼에 채워요.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>변환에 실패했어요</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="ai-todo-text">자연어 입력</Label>
          <Textarea
            id="ai-todo-text"
            value={text}
            maxLength={500}
            disabled={isParsing}
            placeholder="예: 내일 오후 3시까지 중요한 팀 회의 준비하기"
            className="min-h-28"
            onChange={(event) => {
              setText(event.target.value);
              if (error) setError(null);
            }}
          />
          <p className="text-xs text-muted-foreground">
            {text.trim().length}/500자 (최소 2자)
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isParsing}
            onClick={() => setOpen(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            disabled={isParsing}
            onClick={() => {
              void handleParse();
            }}
          >
            {isParsing ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <SparklesIcon data-icon="inline-start" />
            )}
            {isParsing ? "변환 중..." : "AI로 폼 채우기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
