"use client";

import { ClipboardListIcon } from "lucide-react";

import { TodoCard } from "@/components/todo/TodoCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { Todo } from "@/lib/todos/types";
import { cn } from "@/lib/utils";

type TodoListProps = {
  todos: Todo[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  emptyMessage?: string;
  emptyFiltered?: boolean;
  togglingId?: string | null;
  onRetry?: () => void;
  onToggleComplete?: (todo: Todo, completed: boolean) => void;
  onEdit?: (todo: Todo) => void;
  onDelete?: (todo: Todo) => void;
  className?: string;
};

/**
 * 할 일 목록의 로딩·빈·오류 상태와 TodoCard 목록을 렌더링한다.
 */
export const TodoList = ({
  todos,
  isLoading = false,
  isError = false,
  errorMessage = "할 일 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
  emptyMessage = "아직 할 일이 없어요.",
  emptyFiltered = false,
  togglingId = null,
  onRetry,
  onToggleComplete,
  onEdit,
  onDelete,
  className,
}: TodoListProps) => {
  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-3", className)} aria-busy="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-4xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTitle>목록을 불러올 수 없어요</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>{errorMessage}</span>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              다시 시도
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  if (todos.length === 0) {
    return (
      <Empty className={cn("border border-dashed", className)}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardListIcon />
          </EmptyMedia>
          <EmptyTitle>
            {emptyFiltered ? "조건에 맞는 할 일이 없어요" : emptyMessage}
          </EmptyTitle>
          <EmptyDescription>
            {emptyFiltered
              ? "검색어나 필터를 바꿔 다시 찾아보세요."
              : "왼쪽(또는 위쪽) 폼에서 할 일을 추가해 보세요."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {todos.map((todo) => (
        <li key={todo.id}>
          <TodoCard
            todo={todo}
            toggling={togglingId === todo.id}
            onToggleComplete={onToggleComplete}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </li>
      ))}
    </ul>
  );
};
