"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  PRIORITY_LABELS,
  combineLocalDateAndTime,
  isDueTimeUnset,
  toDateLocalValue,
  toTimeLocalValue,
} from "@/lib/todos/status";
import {
  TODO_CATEGORIES,
  TODO_PRIORITIES,
  type Todo,
  type TodoCategory,
  type TodoFormValues,
  type TodoPriority,
} from "@/lib/todos/types";
import { cn } from "@/lib/utils";

type TodoFormProps = {
  mode?: "create" | "edit";
  initialTodo?: Todo | null;
  /** AI 초안 등으로 폼을 미리 채울 때 사용한다. */
  initialValues?: Partial<TodoFormValues> | null;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: TodoFormValues) => void | Promise<void>;
  onCancel?: () => void;
  className?: string;
};

const DEFAULT_VALUES: TodoFormValues = {
  title: "",
  description: "",
  due_date: null,
  priority: "medium",
  category: "기타",
  completed: false,
};

/**
 * Todo 또는 부분 값으로부터 폼 초기값을 만든다.
 */
const buildInitialValues = (
  initialTodo?: Todo | null,
  initialValues?: Partial<TodoFormValues> | null
): TodoFormValues => {
  if (initialTodo) {
    return {
      title: initialTodo.title,
      description: initialTodo.description ?? "",
      due_date: initialTodo.due_date,
      priority: initialTodo.priority,
      category: initialTodo.category,
      completed: initialTodo.completed,
    };
  }

  return {
    ...DEFAULT_VALUES,
    ...initialValues,
    description: initialValues?.description ?? DEFAULT_VALUES.description,
    due_date:
      initialValues?.due_date === undefined
        ? DEFAULT_VALUES.due_date
        : initialValues.due_date,
  };
};

/**
 * 할 일 추가·편집용 폼을 렌더링하고 제출 값을 상위로 전달한다.
 */
export const TodoForm = ({
  mode = "create",
  initialTodo = null,
  initialValues = null,
  isSubmitting = false,
  submitLabel,
  onSubmit,
  onCancel,
  className,
}: TodoFormProps) => {
  const [values, setValues] = useState<TodoFormValues>(() =>
    buildInitialValues(initialTodo, initialValues)
  );
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  useEffect(() => {
    setValues(buildInitialValues(initialTodo, initialValues));
    setTitleError(null);
    setDescriptionError(null);
  }, [initialTodo, initialValues]);

  const resolvedSubmitLabel =
    submitLabel ?? (mode === "edit" ? "변경 사항 저장" : "할 일 추가");

  const dateValue = toDateLocalValue(values.due_date);
  const timeValue = toTimeLocalValue(values.due_date);
  const timeUnset = !values.due_date || isDueTimeUnset(values.due_date);

  /**
   * 날짜·시각 입력을 due_date ISO로 반영한다.
   */
  const updateDue = (nextDate: string, nextTime: string | null) => {
    if (!nextDate) {
      setValues((prev) => ({ ...prev, due_date: null }));
      return;
    }
    setValues((prev) => ({
      ...prev,
      due_date: combineLocalDateAndTime(nextDate, nextTime),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = values.title.trim();
    const description = values.description.trim();

    if (!title) {
      setTitleError("제목을 입력해 주세요.");
      return;
    }
    if (title.length > 200) {
      setTitleError("제목은 200자 이하로 입력해 주세요.");
      return;
    }
    if (description.length > 2000) {
      setDescriptionError("설명은 2000자 이하로 입력해 주세요.");
      return;
    }

    setTitleError(null);
    setDescriptionError(null);
    await onSubmit({
      ...values,
      title,
      description,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-4", className)}
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="todo-title">제목</Label>
        <Input
          id="todo-title"
          name="title"
          value={values.title}
          maxLength={200}
          disabled={isSubmitting}
          aria-invalid={Boolean(titleError)}
          placeholder="예: 팀 회의 준비"
          onChange={(event) => {
            setValues((prev) => ({ ...prev, title: event.target.value }));
            if (titleError) setTitleError(null);
          }}
        />
        {titleError ? (
          <p className="text-sm text-destructive">{titleError}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="todo-description">설명</Label>
        <Textarea
          id="todo-description"
          name="description"
          value={values.description}
          maxLength={2000}
          disabled={isSubmitting}
          aria-invalid={Boolean(descriptionError)}
          placeholder="세부 내용을 적어 주세요."
          onChange={(event) => {
            setValues((prev) => ({
              ...prev,
              description: event.target.value,
            }));
            if (descriptionError) setDescriptionError(null);
          }}
        />
        {descriptionError ? (
          <p className="text-sm text-destructive">{descriptionError}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="todo-due-date">마감일</Label>
          <Button
            type="button"
            variant={values.due_date ? "ghost" : "secondary"}
            size="xs"
            disabled={isSubmitting}
            onClick={() =>
              setValues((prev) => ({
                ...prev,
                due_date: null,
              }))
            }
          >
            날짜 미정
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr]">
          <Input
            id="todo-due-date"
            name="due_date"
            type="date"
            value={dateValue}
            disabled={isSubmitting}
            onChange={(event) => {
              const nextDate = event.target.value;
              updateDue(nextDate, timeUnset ? null : timeValue || null);
            }}
          />
          <Input
            id="todo-due-time"
            name="due_time"
            type="time"
            value={timeValue}
            disabled={isSubmitting || !dateValue}
            aria-label="마감 시각"
            onChange={(event) => {
              updateDue(dateValue, event.target.value || null);
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={timeUnset && dateValue ? "secondary" : "ghost"}
            size="xs"
            disabled={isSubmitting || !dateValue}
            onClick={() => updateDue(dateValue, null)}
          >
            시간 미정
          </Button>
          <p className="text-xs text-muted-foreground">
            {!values.due_date
              ? "현재 마감일은 미정입니다."
              : timeUnset
                ? "날짜만 지정됨 · 시간은 미정입니다."
                : "날짜와 시간을 모두 지정했습니다."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="todo-priority">우선순위</Label>
          <Select
            value={values.priority}
            items={PRIORITY_LABELS}
            disabled={isSubmitting}
            onValueChange={(value) => {
              if (value == null) return;
              setValues((prev) => ({
                ...prev,
                priority: value as TodoPriority,
              }));
            }}
          >
            <SelectTrigger id="todo-priority" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TODO_PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="todo-category">카테고리</Label>
          <Select
            value={values.category}
            items={Object.fromEntries(
              TODO_CATEGORIES.map((category) => [category, category])
            )}
            disabled={isSubmitting}
            onValueChange={(value) => {
              if (value == null) return;
              setValues((prev) => ({
                ...prev,
                category: value as TodoCategory,
              }));
            }}
          >
            <SelectTrigger id="todo-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TODO_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {mode === "edit" ? (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={values.completed}
            disabled={isSubmitting}
            onCheckedChange={(checked) => {
              if (typeof checked === "boolean") {
                setValues((prev) => ({ ...prev, completed: checked }));
              }
            }}
          />
          완료로 표시
        </label>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            취소
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
          {resolvedSubmitLabel}
        </Button>
      </div>
    </form>
  );
};
