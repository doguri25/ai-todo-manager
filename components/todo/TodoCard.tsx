"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CATEGORY_CLASS,
  PRIORITY_CLASS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  formatDateTime,
  getTodoStatus,
} from "@/lib/todos/status";
import type { Todo } from "@/lib/todos/types";
import { cn } from "@/lib/utils";

type TodoCardProps = {
  todo: Todo;
  toggling?: boolean;
  onToggleComplete?: (todo: Todo, completed: boolean) => void;
  onEdit?: (todo: Todo) => void;
  onDelete?: (todo: Todo) => void;
  className?: string;
};

/**
 * 개별 할 일의 제목·배지·마감일을 카드로 표시한다.
 */
export const TodoCard = ({
  todo,
  toggling = false,
  onToggleComplete,
  onEdit,
  onDelete,
  className,
}: TodoCardProps) => {
  const status = getTodoStatus(todo);

  return (
    <Card
      size="sm"
      className={cn(
        "transition-opacity",
        todo.completed && "opacity-70",
        className
      )}
    >
      <CardHeader className="grid-cols-[auto_1fr_auto] items-start gap-3">
        <Checkbox
          checked={todo.completed}
          disabled={toggling || !onToggleComplete}
          aria-label={`${todo.title} 완료 여부`}
          onCheckedChange={(checked) => {
            if (typeof checked === "boolean") {
              onToggleComplete?.(todo, checked);
            }
          }}
          className="mt-1"
        />
        <div className="min-w-0 space-y-1.5">
          <CardTitle
            className={cn(
              "break-words",
              todo.completed && "text-muted-foreground line-through"
            )}
          >
            {todo.title}
          </CardTitle>
          {todo.description ? (
            <CardDescription className="line-clamp-2 break-words">
              {todo.description}
            </CardDescription>
          ) : null}
        </div>
        <CardAction className="flex gap-1">
          {onEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="할 일 수정"
              onClick={() => onEdit(todo)}
            >
              <PencilIcon />
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="할 일 삭제"
              onClick={() => onDelete(todo)}
            >
              <Trash2Icon />
            </Button>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={PRIORITY_CLASS[todo.priority]}>
          {PRIORITY_LABELS[todo.priority]}
        </Badge>
        <Badge variant="outline" className={CATEGORY_CLASS[todo.category]}>
          {todo.category}
        </Badge>
        <Badge
          variant="outline"
          className={cn(
            status === "overdue" &&
              "border-warning/30 bg-warning/10 text-warning",
            status === "completed" &&
              "border-success/30 bg-success/10 text-success"
          )}
        >
          {STATUS_LABELS[status]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          마감 {formatDateTime(todo.due_date)}
        </span>
        <span className="text-xs text-muted-foreground">
          생성 {formatDateTime(todo.created_at)}
        </span>
      </CardContent>
    </Card>
  );
};
