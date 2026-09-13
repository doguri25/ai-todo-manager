"use client";

import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CompletionFilter,
  TodoSortKey,
  TodoSortOrder,
} from "@/lib/todos/filter";
import { PRIORITY_LABELS } from "@/lib/todos/status";
import { TODO_PRIORITIES, type TodoPriority } from "@/lib/todos/types";

const COMPLETION_ITEMS: Record<CompletionFilter, string> = {
  all: "전체",
  incomplete: "미완료",
  completed: "완료",
};

const PRIORITY_FILTER_ITEMS: Record<TodoPriority | "all", string> = {
  all: "전체",
  high: PRIORITY_LABELS.high,
  medium: PRIORITY_LABELS.medium,
  low: PRIORITY_LABELS.low,
};

const SORT_ITEMS: Record<TodoSortKey, string> = {
  created_at: "생성일",
  due_date: "마감일",
  priority: "우선순위",
  title: "제목",
};

const ORDER_ITEMS: Record<TodoSortOrder, string> = {
  asc: "오름차순",
  desc: "내림차순",
};

type TodoToolbarProps = {
  query: string;
  completion: CompletionFilter;
  priority: TodoPriority | "all";
  sort: TodoSortKey;
  order: TodoSortOrder;
  onQueryChange: (value: string) => void;
  onCompletionChange: (value: CompletionFilter) => void;
  onPriorityChange: (value: TodoPriority | "all") => void;
  onSortChange: (value: TodoSortKey) => void;
  onOrderChange: (value: TodoSortOrder) => void;
};

/**
 * 검색·완료 상태·우선순위 필터와 정렬 컨트롤을 제공한다.
 */
export const TodoToolbar = ({
  query,
  completion,
  priority,
  sort,
  order,
  onQueryChange,
  onCompletionChange,
  onPriorityChange,
  onSortChange,
  onOrderChange,
}: TodoToolbarProps) => {
  return (
    <section
      aria-label="할 일 검색 및 필터"
      className="rounded-4xl border border-border/80 bg-card p-3 shadow-sm"
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-[8rem] flex-[1_1_8rem] max-w-[12rem] flex-col gap-1.5">
          <Label htmlFor="todo-search" className="text-xs">
            검색
          </Label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="todo-search"
              value={query}
              placeholder="제목"
              className="h-9 pl-8 text-sm"
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </div>
        </div>

        <div className="flex w-[5.75rem] shrink-0 flex-col gap-1.5">
          <Label htmlFor="todo-completion-filter" className="text-xs">
            상태
          </Label>
          <Select
            value={completion}
            items={COMPLETION_ITEMS}
            onValueChange={(value) => {
              if (value == null) return;
              onCompletionChange(value as CompletionFilter);
            }}
          >
            <SelectTrigger
              id="todo-completion-filter"
              className="h-9 w-full text-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              className="min-w-0 w-(--anchor-width) max-w-(--anchor-width)"
            >
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="incomplete">미완료</SelectItem>
              <SelectItem value="completed">완료</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-[5.75rem] shrink-0 flex-col gap-1.5">
          <Label htmlFor="todo-priority-filter" className="text-xs">
            우선순위
          </Label>
          <Select
            value={priority}
            items={PRIORITY_FILTER_ITEMS}
            onValueChange={(value) => {
              if (value == null) return;
              onPriorityChange(value as TodoPriority | "all");
            }}
          >
            <SelectTrigger
              id="todo-priority-filter"
              className="h-9 w-full text-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              className="min-w-0 w-(--anchor-width) max-w-(--anchor-width)"
            >
              <SelectItem value="all">전체</SelectItem>
              {TODO_PRIORITIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {PRIORITY_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-[6.5rem] shrink-0 flex-col gap-1.5">
          <Label htmlFor="todo-sort" className="text-xs">
            정렬
          </Label>
          <Select
            value={sort}
            items={SORT_ITEMS}
            onValueChange={(value) => {
              if (value == null) return;
              onSortChange(value as TodoSortKey);
            }}
          >
            <SelectTrigger id="todo-sort" className="h-9 w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              className="min-w-0 w-(--anchor-width) max-w-(--anchor-width)"
            >
              <SelectItem value="created_at">생성일</SelectItem>
              <SelectItem value="due_date">마감일</SelectItem>
              <SelectItem value="priority">우선순위</SelectItem>
              <SelectItem value="title">제목</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-[6.5rem] shrink-0 flex-col gap-1.5">
          <Label htmlFor="todo-order" className="text-xs">
            순서
          </Label>
          <Select
            value={order}
            items={ORDER_ITEMS}
            onValueChange={(value) => {
              if (value == null) return;
              onOrderChange(value as TodoSortOrder);
            }}
          >
            <SelectTrigger id="todo-order" className="h-9 w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              className="min-w-0 w-(--anchor-width) max-w-(--anchor-width)"
            >
              <SelectItem value="asc">오름차순</SelectItem>
              <SelectItem value="desc">내림차순</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
};
